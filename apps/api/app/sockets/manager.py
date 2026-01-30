import socketio
from typing import Optional

from app.config import settings
from app.db.redis import redis_client
from app.services.avalon import (
    AvalonGame,
    AvalonPhase,
    get_game,
    create_game,
    remove_game,
)

# Create Socket.IO server with Redis adapter for scaling
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.cors_origins_list,
    logger=settings.api_debug,
    engineio_logger=settings.api_debug,
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, dict] = {}

    async def connect(self, sid: str, user_data: dict):
        self.active_connections[sid] = user_data
        await redis_client.set_session(
            f"socket:{sid}",
            user_data,
            expire=86400,
        )

    async def disconnect(self, sid: str):
        if sid in self.active_connections:
            user_data = self.active_connections.pop(sid)
            await redis_client.delete_session(f"socket:{sid}")
            return user_data
        return None

    def get_user_data(self, sid: str) -> Optional[dict]:
        return self.active_connections.get(sid)

    def get_room_players(self, room_id: str) -> list[dict]:
        """Get deduplicated list of players in a room"""
        seen_users = set()
        players = []
        for socket_id, conn_data in self.active_connections.items():
            if isinstance(conn_data, dict) and conn_data.get("room_id") == room_id:
                uid = conn_data.get("user_id")
                if uid and uid not in seen_users:
                    seen_users.add(uid)
                    players.append({
                        "user_id": uid,
                        "username": conn_data.get("username"),
                        "display_name": conn_data.get("display_name"),
                    })
        return players


manager = ConnectionManager()


async def _handle_host_transfer(room_id: str, leaving_user_id: int):
    """Transfer host to the next earliest joined user when host leaves."""
    from app.db.database import async_session
    from app.models.room import Room
    from sqlalchemy import select

    async with async_session() as session:
        result = await session.execute(
            select(Room).where(Room.code == room_id)
        )
        room = result.scalar_one_or_none()

        if room and room.host_id == leaving_user_id:
            # Find next host
            next_host_id = await redis_client.get_next_host(room_id, str(leaving_user_id))

            if next_host_id:
                room.host_id = int(next_host_id)
                await session.commit()

                # Notify all clients in the room about host change
                await sio.emit(
                    "host_changed",
                    {"new_host_id": int(next_host_id)},
                    room=room_id,
                )
                print(f"[host_transfer] Host transferred to user {next_host_id} in room {room_id}")
            else:
                print(f"[host_transfer] No eligible user to transfer host in room {room_id}")


@sio.event
async def connect(sid, environ, auth):
    print(f"Client connected: {sid}")
    user_data = auth if auth else {"guest": True}
    await manager.connect(sid, user_data)
    await sio.emit("connected", {"sid": sid}, to=sid)


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    user_data = await manager.disconnect(sid)
    if user_data and "room_id" in user_data:
        room_id = user_data["room_id"]
        user_id = user_data.get("user_id")

        # Handle host transfer before removing user
        if user_id:
            await _handle_host_transfer(room_id, user_id)

        await redis_client.remove_user_from_room(room_id, str(user_id or sid))
        await sio.emit(
            "user_left",
            {"user_id": user_id, "username": user_data.get("username")},
            room=room_id,
        )


@sio.event
async def join_room(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    username = data.get("username")
    display_name = data.get("display_name", username)

    print(f"[join_room] sid={sid}, room_id={room_id}, user_id={user_id}, display_name={display_name}")

    if not room_id or not user_id:
        await sio.emit("error", {"message": "Missing room_id or user_id"}, to=sid)
        return

    await sio.enter_room(sid, room_id)
    print(f"[join_room] Socket {sid} entered room {room_id}")
    await redis_client.add_user_to_room(room_id, str(user_id), sid)

    # Update connection data with full user info
    user_data = manager.get_user_data(sid) or {}
    user_data.update({
        "room_id": room_id,
        "user_id": user_id,
        "username": username,
        "display_name": display_name,
    })
    await manager.connect(sid, user_data)

    # Notify room about new user
    await sio.emit(
        "user_joined",
        {
            "user_id": user_id,
            "username": username,
            "display_name": display_name,
        },
        room=room_id,
    )

    # Build full player list with user details (deduplicated by user_id)
    all_players = manager.get_room_players(room_id)

    print(f"Room {room_id} players: {all_players}")
    await sio.emit("room_users", {"players": all_players}, to=sid)


@sio.event
async def leave_room(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    username = data.get("username")

    if not room_id:
        return

    # Handle host transfer before removing user
    if user_id:
        await _handle_host_transfer(room_id, user_id)

    await sio.leave_room(sid, room_id)
    await redis_client.remove_user_from_room(room_id, str(user_id))

    await sio.emit(
        "user_left",
        {"user_id": user_id, "username": username},
        room=room_id,
    )


@sio.event
async def chat_message(sid, data):
    room_id = data.get("room_id")
    message = data.get("message")
    user_data = manager.get_user_data(sid)

    if not room_id or not message or not user_data:
        return

    await sio.emit(
        "chat_message",
        {
            "user_id": user_data.get("user_id"),
            "username": user_data.get("username"),
            "display_name": user_data.get("display_name"),
            "message": message,
        },
        room=room_id,
    )


@sio.event
async def game_action(sid, data):
    room_id = data.get("room_id")
    action = data.get("action")
    payload = data.get("payload", {})
    user_data = manager.get_user_data(sid)

    if not room_id or not action or not user_data:
        await sio.emit("error", {"message": "Invalid game action"}, to=sid)
        return

    # Broadcast game action to all players in the room
    await sio.emit(
        "game_action",
        {
            "user_id": user_data.get("user_id"),
            "action": action,
            "payload": payload,
        },
        room=room_id,
    )


@sio.event
async def ready_toggle(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    is_ready = data.get("is_ready", False)

    if not room_id or not user_id:
        return

    await sio.emit(
        "player_ready",
        {"user_id": user_id, "is_ready": is_ready},
        room=room_id,
    )


# ============================================
# Avalon Game Events
# ============================================

@sio.event
async def start_game(sid, data):
    """
    Start an Avalon game.
    Expected data: { room_id, game_type, game_id }
    """
    room_id = data.get("room_id")
    game_type = data.get("game_type")
    game_id = data.get("game_id")

    if not room_id:
        await sio.emit("error", {"message": "Missing room_id"}, to=sid)
        return

    if game_type != "avalon":
        # For non-Avalon games, just broadcast game_started
        await sio.emit(
            "game_started",
            {"room_id": room_id, "game_type": game_type},
            room=room_id,
        )
        return

    # Get all players in the room
    players = manager.get_room_players(room_id)

    if len(players) < 5:
        await sio.emit("error", {"message": "아발론은 최소 5명이 필요합니다"}, to=sid)
        return

    if len(players) > 10:
        await sio.emit("error", {"message": "아발론은 최대 10명까지 가능합니다"}, to=sid)
        return

    try:
        # Create and initialize the game
        game = create_game(game_id, room_id, players)
        game_state = game.state.to_dict()

        # Broadcast game started to all players
        await sio.emit(
            "game_started",
            {
                "room_id": room_id,
                "game_type": game_type,
                "game_id": game_id,
                "game_state": game_state,
            },
            room=room_id,
        )

        # Send individual role information and game state to each player
        for socket_id, conn_data in manager.active_connections.items():
            if isinstance(conn_data, dict) and conn_data.get("room_id") == room_id:
                user_id = conn_data.get("user_id")
                if user_id:
                    player_view = game.get_player_view(user_id)
                    # Send role assignment
                    await sio.emit(
                        "role_assigned",
                        {
                            "game_id": game_id,
                            "role": player_view.get("my_role"),
                            "team": player_view.get("my_team"),
                            "known_info": player_view.get("known_info", []),
                        },
                        to=socket_id,
                    )
                    # Send full game state with can_act and available_actions
                    await sio.emit(
                        "game_state_update",
                        {
                            "game_id": game_id,
                            "state": player_view,
                        },
                        to=socket_id,
                    )

        print(f"Avalon game {game_id} started in room {room_id} with {len(players)} players")

    except Exception as e:
        print(f"Error starting game: {e}")
        await sio.emit("error", {"message": str(e)}, to=sid)


@sio.event
async def propose_team(sid, data):
    """
    Leader proposes a team for the mission.
    Expected data: { game_id, team_members: [user_id, ...] }
    """
    print(f"[propose_team] Received: {data}")

    game_id = data.get("game_id")
    team_members = data.get("team_members", [])
    user_data = manager.get_user_data(sid)

    print(f"[propose_team] game_id={game_id}, team_members={team_members}, user_data={user_data}")

    if not game_id or not user_data:
        print(f"[propose_team] ERROR: Invalid request - game_id={game_id}, user_data={user_data}")
        await sio.emit("error", {"message": "Invalid request"}, to=sid)
        return

    game = get_game(game_id)
    print(f"[propose_team] get_game result: {game}")

    if not game:
        print(f"[propose_team] ERROR: Game not found for game_id={game_id}")
        await sio.emit("error", {"message": "Game not found"}, to=sid)
        return

    user_id = user_data.get("user_id")
    room_id = user_data.get("room_id")

    # Debug: Log all connections in this room
    room_connections = []
    for socket_id, conn_data in manager.active_connections.items():
        if isinstance(conn_data, dict) and conn_data.get("room_id") == room_id:
            room_connections.append({
                "socket_id": socket_id,
                "user_id": conn_data.get("user_id"),
                "display_name": conn_data.get("display_name"),
            })
    print(f"[propose_team] Broadcasting to room_id={room_id}, connections in room: {room_connections}")

    try:
        result = game.propose_team(user_id, team_members)
        print(f"[propose_team] propose_team result: {result}")

        # Broadcast team proposal to all players
        broadcast_data = {
            "game_id": game_id,
            "leader_id": user_id,
            "proposed_team": team_members,
            "phase": result["phase"],
        }
        print(f"[propose_team] Emitting team_proposed to room={room_id}: {broadcast_data}")
        await sio.emit(
            "team_proposed",
            broadcast_data,
            room=room_id,
        )

        # Send updated player views
        await _broadcast_player_views(game, room_id)

    except ValueError as e:
        await sio.emit("error", {"message": str(e)}, to=sid)


@sio.event
async def vote_team(sid, data):
    """
    Player votes to approve or reject the proposed team.
    Expected data: { game_id, approve: bool }
    """
    game_id = data.get("game_id")
    approve = data.get("approve", False)
    user_data = manager.get_user_data(sid)

    if not game_id or not user_data:
        await sio.emit("error", {"message": "Invalid request"}, to=sid)
        return

    game = get_game(game_id)
    if not game:
        await sio.emit("error", {"message": "Game not found"}, to=sid)
        return

    user_id = user_data.get("user_id")
    room_id = user_data.get("room_id")

    try:
        result = game.vote_team(user_id, approve)

        # Broadcast vote update (without revealing the vote until all voted)
        await sio.emit(
            "team_vote_update",
            {
                "game_id": game_id,
                "user_id": user_id,
                "votes_count": result["votes_count"] if not result.get("voting_complete") else len(game.state.players),
                "total_players": result.get("total_players", len(game.state.players)),
            },
            room=room_id,
        )

        if result.get("voting_complete"):
            # Broadcast the final vote result with all votes revealed
            await sio.emit(
                "team_vote_result",
                {
                    "game_id": game_id,
                    "team_approved": result["team_approved"],
                    "approve_count": result["approve_count"],
                    "reject_count": result["reject_count"],
                    "votes": result["votes"],
                    "vote_track": game.state.vote_track,
                    "phase": result["phase"],
                    "new_leader_id": result.get("new_leader_id"),
                },
                room=room_id,
            )

            if result.get("game_over"):
                await _broadcast_game_ended(game, room_id, result.get("reason"))
            else:
                # Send updated player views
                await _broadcast_player_views(game, room_id)

    except ValueError as e:
        await sio.emit("error", {"message": str(e)}, to=sid)


@sio.event
async def vote_mission(sid, data):
    """
    Mission team member votes success or fail.
    Expected data: { game_id, success: bool }
    """
    game_id = data.get("game_id")
    success = data.get("success", True)
    user_data = manager.get_user_data(sid)

    if not game_id or not user_data:
        await sio.emit("error", {"message": "Invalid request"}, to=sid)
        return

    game = get_game(game_id)
    if not game:
        await sio.emit("error", {"message": "Game not found"}, to=sid)
        return

    user_id = user_data.get("user_id")
    room_id = user_data.get("room_id")

    try:
        result = game.vote_mission(user_id, success)
        print(f"[vote_mission] Result: {result}")

        # Only broadcast vote update if mission is not complete yet
        if not result.get("mission_complete"):
            await sio.emit(
                "mission_vote_update",
                {
                    "game_id": game_id,
                    "votes_count": result["votes_count"],
                    "team_size": result["team_size"],
                },
                room=room_id,
            )
        else:
            # Broadcast mission result
            mission_result_data = {
                "game_id": game_id,
                "round": result["round"],
                "result": result["mission_result"],
                "fail_count": result["fail_count"],
                "mission_votes_shuffled": result["mission_votes_shuffled"],
                "success_total": result["success_total"],
                "fail_total": result["fail_total"],
                "phase": result["phase"],
                "next_round": result.get("next_round"),
                "new_leader_id": result.get("new_leader_id"),
            }
            print(f"[vote_mission] Broadcasting mission_result to room={room_id}: {mission_result_data}")
            await sio.emit(
                "mission_result",
                mission_result_data,
                room=room_id,
            )

            if result.get("game_over"):
                await _broadcast_game_ended(game, room_id, result.get("reason"))
            else:
                # Send updated player views
                await _broadcast_player_views(game, room_id)

    except ValueError as e:
        print(f"[vote_mission] ValueError: {e}")
        await sio.emit("error", {"message": str(e)}, to=sid)
    except Exception as e:
        print(f"[vote_mission] Unexpected error: {type(e).__name__}: {e}")
        await sio.emit("error", {"message": f"Error: {str(e)}"}, to=sid)


@sio.event
async def assassinate(sid, data):
    """
    Assassin attempts to kill Merlin.
    Expected data: { game_id, target_id: user_id }
    """
    game_id = data.get("game_id")
    target_id = data.get("target_id")
    user_data = manager.get_user_data(sid)

    if not game_id or not target_id or not user_data:
        await sio.emit("error", {"message": "Invalid request"}, to=sid)
        return

    game = get_game(game_id)
    if not game:
        await sio.emit("error", {"message": "Game not found"}, to=sid)
        return

    user_id = user_data.get("user_id")
    room_id = user_data.get("room_id")

    try:
        result = game.assassinate(user_id, target_id)

        # Broadcast assassination result
        await sio.emit(
            "assassination_result",
            {
                "game_id": game_id,
                "target_id": target_id,
                "merlin_killed": result["merlin_killed"],
                "winner_team": result["winner_team"],
            },
            room=room_id,
        )

        await _broadcast_game_ended(game, room_id, result.get("reason"))

    except ValueError as e:
        await sio.emit("error", {"message": str(e)}, to=sid)


@sio.event
async def get_game_state(sid, data):
    """
    Get current game state for a player (used for reconnection).
    Expected data: { game_id }
    """
    game_id = data.get("game_id")
    user_data = manager.get_user_data(sid)

    if not game_id or not user_data:
        await sio.emit("error", {"message": "Invalid request"}, to=sid)
        return

    game = get_game(game_id)
    if not game:
        await sio.emit("error", {"message": "Game not found"}, to=sid)
        return

    user_id = user_data.get("user_id")

    try:
        player_view = game.get_player_view(user_id)
        await sio.emit(
            "game_state_update",
            {
                "game_id": game_id,
                "state": player_view,
            },
            to=sid,
        )
    except Exception as e:
        await sio.emit("error", {"message": str(e)}, to=sid)


async def _broadcast_player_views(game: AvalonGame, room_id: str):
    """Send updated game state to each player with their personal view"""
    print(f"[_broadcast_player_views] Broadcasting to room_id={room_id}")
    sent_count = 0
    for socket_id, conn_data in manager.active_connections.items():
        if isinstance(conn_data, dict) and conn_data.get("room_id") == room_id:
            user_id = conn_data.get("user_id")
            if user_id:
                try:
                    player_view = game.get_player_view(user_id)
                    print(f"[_broadcast_player_views] Sending to user_id={user_id}, phase={player_view.get('phase')}, round={player_view.get('current_round')}")
                    await sio.emit(
                        "game_state_update",
                        {
                            "game_id": game.state.game_id,
                            "state": player_view,
                        },
                        to=socket_id,
                    )
                    sent_count += 1
                except Exception as e:
                    print(f"[_broadcast_player_views] Error sending player view to {user_id}: {e}")
    print(f"[_broadcast_player_views] Sent to {sent_count} players")


async def _broadcast_game_ended(game: AvalonGame, room_id: str, reason: str):
    """Broadcast game end with all roles revealed"""
    try:
        game_result = game.get_game_result()
        await sio.emit(
            "game_ended",
            {
                "game_id": game.state.game_id,
                "winner_team": game_result["winner_team"],
                "reason": reason,
                "players": game_result["players"],
                "mission_results": game_result["mission_results"],
                "assassination_target": game_result.get("assassination_target"),
            },
            room=room_id,
        )

        # Clean up the game from memory
        remove_game(game.state.game_id)

    except Exception as e:
        print(f"Error broadcasting game end: {e}")
