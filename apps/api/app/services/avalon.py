"""
Avalon Game Service

Implements the game logic for The Resistance: Avalon.
"""

import random
from typing import Optional
from enum import Enum
from dataclasses import dataclass, field


class AvalonPhase(str, Enum):
    NIGHT = "night"
    TEAM_SELECTION = "team_selection"
    TEAM_VOTE = "team_vote"
    MISSION = "mission"
    ASSASSINATION = "assassination"
    GAME_OVER = "game_over"


class AvalonRole(str, Enum):
    # Good team
    MERLIN = "merlin"
    PERCIVAL = "percival"
    LOYAL_SERVANT = "loyal_servant"
    # Evil team
    MORDRED = "mordred"
    MORGANA = "morgana"
    ASSASSIN = "assassin"
    OBERON = "oberon"
    MINION = "minion"


class AvalonTeam(str, Enum):
    GOOD = "good"
    EVIL = "evil"


# Team sizes by player count
TEAM_SIZES: dict[int, list[int]] = {
    5: [2, 3, 2, 3, 3],
    6: [2, 3, 4, 3, 4],
    7: [2, 3, 3, 4, 4],
    8: [3, 4, 4, 5, 5],
    9: [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5],
}

# Evil count by player count
EVIL_COUNT: dict[int, int] = {
    5: 2,
    6: 2,
    7: 3,
    8: 3,
    9: 3,
    10: 4,
}

# Fails required for mission failure (default is 1)
# 4th mission (index 3) for 7+ players requires 2 fails
FAIL_REQUIREMENT: dict[int, list[int]] = {
    5: [1, 1, 1, 1, 1],
    6: [1, 1, 1, 1, 1],
    7: [1, 1, 1, 2, 1],
    8: [1, 1, 1, 2, 1],
    9: [1, 1, 1, 2, 1],
    10: [1, 1, 1, 2, 1],
}

# Role configurations by player count
ROLES_CONFIG: dict[int, dict[str, list[str]]] = {
    5: {
        "good": ["merlin", "percival", "loyal_servant"],
        "evil": ["morgana", "assassin"],
    },
    6: {
        "good": ["merlin", "percival", "loyal_servant", "loyal_servant"],
        "evil": ["morgana", "assassin"],
    },
    7: {
        "good": ["merlin", "percival", "loyal_servant", "loyal_servant"],
        "evil": ["morgana", "assassin", "oberon"],
    },
    8: {
        "good": ["merlin", "percival", "loyal_servant", "loyal_servant", "loyal_servant"],
        "evil": ["morgana", "assassin", "minion"],
    },
    9: {
        "good": ["merlin", "percival", "loyal_servant", "loyal_servant", "loyal_servant", "loyal_servant"],
        "evil": ["morgana", "assassin", "mordred"],
    },
    10: {
        "good": ["merlin", "percival", "loyal_servant", "loyal_servant", "loyal_servant", "loyal_servant"],
        "evil": ["morgana", "assassin", "mordred", "oberon"],
    },
}


@dataclass
class AvalonPlayer:
    user_id: int
    username: str
    display_name: str
    role: Optional[AvalonRole] = None
    team: Optional[AvalonTeam] = None

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "display_name": self.display_name,
            "role": self.role.value if self.role else None,
            "team": self.team.value if self.team else None,
        }

    def to_public_dict(self) -> dict:
        """Public info - no role/team"""
        return {
            "user_id": self.user_id,
            "username": self.username,
            "display_name": self.display_name,
        }


@dataclass
class MissionResult:
    round: int
    team_size: int
    leader_id: int
    team: list[int]
    team_votes: dict[int, bool]  # player_id -> approve/reject
    mission_votes: Optional[list[bool]] = None  # List of success/fail (shuffled, no player association)
    result: Optional[str] = None  # "success" or "fail"

    def to_dict(self) -> dict:
        return {
            "round": self.round,
            "team_size": self.team_size,
            "leader_id": self.leader_id,
            "team": self.team,
            "team_votes": self.team_votes,
            "mission_votes": self.mission_votes,
            "result": self.result,
        }


@dataclass
class AvalonGameState:
    game_id: int
    room_id: int
    players: list[AvalonPlayer] = field(default_factory=list)
    phase: AvalonPhase = AvalonPhase.NIGHT
    current_round: int = 1  # 1-5
    current_leader_index: int = 0
    vote_track: int = 0  # Consecutive rejections (0-5)
    mission_results: list[Optional[str]] = field(default_factory=lambda: [None, None, None, None, None])
    success_count: int = 0
    fail_count: int = 0

    # Current round state
    proposed_team: list[int] = field(default_factory=list)
    team_votes: dict[int, bool] = field(default_factory=dict)
    mission_votes: dict[int, bool] = field(default_factory=dict)

    # History
    mission_history: list[MissionResult] = field(default_factory=list)

    # Game result
    winner_team: Optional[AvalonTeam] = None
    assassination_target: Optional[int] = None

    def to_dict(self) -> dict:
        return {
            "game_id": self.game_id,
            "room_id": self.room_id,
            "players": [p.to_public_dict() for p in self.players],
            "phase": self.phase.value,
            "current_round": self.current_round,
            "current_leader_id": self.get_current_leader_id(),
            "vote_track": self.vote_track,
            "mission_results": self.mission_results,
            "success_count": self.success_count,
            "fail_count": self.fail_count,
            "proposed_team": self.proposed_team,
            "team_votes_count": len(self.team_votes),
            "mission_votes_count": len(self.mission_votes),
            "winner_team": self.winner_team.value if self.winner_team else None,
            "team_size_required": self.get_team_size_required(),
            "mission_history": [m.to_dict() for m in self.mission_history],
        }

    def get_current_leader_id(self) -> Optional[int]:
        if not self.players:
            return None
        return self.players[self.current_leader_index].user_id

    def get_team_size_required(self) -> int:
        player_count = len(self.players)
        if player_count not in TEAM_SIZES:
            return 0
        return TEAM_SIZES[player_count][self.current_round - 1]

    def get_fail_requirement(self) -> int:
        player_count = len(self.players)
        if player_count not in FAIL_REQUIREMENT:
            return 1
        return FAIL_REQUIREMENT[player_count][self.current_round - 1]


class AvalonGame:
    """Main game logic handler for Avalon"""

    def __init__(self, game_id: int, room_id: int):
        self.state = AvalonGameState(game_id=game_id, room_id=room_id)

    def initialize_game(self, players: list[dict]) -> dict:
        """
        Initialize the game with players and assign roles.
        players: list of {user_id, username, display_name}
        """
        player_count = len(players)
        if player_count < 5 or player_count > 10:
            raise ValueError(f"Avalon requires 5-10 players, got {player_count}")

        # Create player objects
        self.state.players = [
            AvalonPlayer(
                user_id=p["user_id"],
                username=p["username"],
                display_name=p["display_name"],
            )
            for p in players
        ]

        # Shuffle players for random seating order
        random.shuffle(self.state.players)

        # Assign roles
        self._assign_roles()

        # Set random starting leader
        self.state.current_leader_index = random.randint(0, player_count - 1)

        # Move to team selection phase
        self.state.phase = AvalonPhase.TEAM_SELECTION

        return self.state.to_dict()

    def _assign_roles(self):
        """Assign roles based on player count"""
        player_count = len(self.state.players)
        config = ROLES_CONFIG[player_count]

        all_roles = config["good"] + config["evil"]
        random.shuffle(all_roles)

        for i, player in enumerate(self.state.players):
            role = AvalonRole(all_roles[i])
            player.role = role
            player.team = AvalonTeam.EVIL if all_roles[i] in config["evil"] else AvalonTeam.GOOD

    def get_player_view(self, user_id: int) -> dict:
        """
        Get the game state from a specific player's perspective.
        This includes their role and what they know about other players.
        """
        player = self._get_player(user_id)
        if not player:
            return {}

        view = self.state.to_dict()
        view["my_role"] = player.role.value if player.role else None
        view["my_team"] = player.team.value if player.team else None
        view["known_info"] = self._get_known_info(player)
        view["can_act"] = self._can_player_act(user_id)
        view["available_actions"] = self._get_available_actions(user_id)

        # Add vote info for the player
        if user_id in self.state.team_votes:
            view["my_team_vote"] = self.state.team_votes[user_id]
        if user_id in self.state.mission_votes:
            view["my_mission_vote"] = self.state.mission_votes[user_id]

        return view

    def _get_known_info(self, player: AvalonPlayer) -> list[dict]:
        """
        Get information visible to this player based on their role.
        """
        known = []

        if player.role == AvalonRole.MERLIN:
            # Merlin sees all evil except Mordred
            for p in self.state.players:
                if p.team == AvalonTeam.EVIL and p.role != AvalonRole.MORDRED:
                    known.append({
                        "user_id": p.user_id,
                        "info": "evil",
                        "display_name": p.display_name,
                    })

        elif player.role == AvalonRole.PERCIVAL:
            # Percival sees Merlin and Morgana (can't distinguish)
            for p in self.state.players:
                if p.role in [AvalonRole.MERLIN, AvalonRole.MORGANA]:
                    known.append({
                        "user_id": p.user_id,
                        "info": "merlin_or_morgana",
                        "display_name": p.display_name,
                    })

        elif player.team == AvalonTeam.EVIL and player.role != AvalonRole.OBERON:
            # Evil team members see each other (except Oberon is hidden)
            for p in self.state.players:
                if p.user_id != player.user_id and p.team == AvalonTeam.EVIL and p.role != AvalonRole.OBERON:
                    known.append({
                        "user_id": p.user_id,
                        "info": "evil_teammate",
                        "display_name": p.display_name,
                    })

        return known

    def _can_player_act(self, user_id: int) -> bool:
        """Check if this player can take an action right now"""
        phase = self.state.phase

        if phase == AvalonPhase.TEAM_SELECTION:
            return self.state.get_current_leader_id() == user_id

        elif phase == AvalonPhase.TEAM_VOTE:
            return user_id not in self.state.team_votes

        elif phase == AvalonPhase.MISSION:
            return user_id in self.state.proposed_team and user_id not in self.state.mission_votes

        elif phase == AvalonPhase.ASSASSINATION:
            player = self._get_player(user_id)
            return player and player.role == AvalonRole.ASSASSIN

        return False

    def _get_available_actions(self, user_id: int) -> list[str]:
        """Get list of actions available to this player"""
        actions = []
        player = self._get_player(user_id)
        if not player:
            return actions

        phase = self.state.phase

        if phase == AvalonPhase.TEAM_SELECTION:
            if self.state.get_current_leader_id() == user_id:
                actions.append("propose_team")

        elif phase == AvalonPhase.TEAM_VOTE:
            if user_id not in self.state.team_votes:
                actions.append("vote_team")

        elif phase == AvalonPhase.MISSION:
            if user_id in self.state.proposed_team and user_id not in self.state.mission_votes:
                actions.append("vote_mission")
                # Show what votes are available
                if player.team == AvalonTeam.EVIL:
                    actions.append("can_fail")  # Evil can choose to fail

        elif phase == AvalonPhase.ASSASSINATION:
            if player.role == AvalonRole.ASSASSIN:
                actions.append("assassinate")

        return actions

    def _get_player(self, user_id: int) -> Optional[AvalonPlayer]:
        """Get player by user_id"""
        for p in self.state.players:
            if p.user_id == user_id:
                return p
        return None

    def _get_player_index(self, user_id: int) -> int:
        """Get player index by user_id"""
        for i, p in enumerate(self.state.players):
            if p.user_id == user_id:
                return i
        return -1

    def propose_team(self, leader_id: int, team_members: list[int]) -> dict:
        """
        Leader proposes a team for the mission.
        Returns the result or raises an error.
        """
        if self.state.phase != AvalonPhase.TEAM_SELECTION:
            raise ValueError("Not in team selection phase")

        if self.state.get_current_leader_id() != leader_id:
            raise ValueError("Only the leader can propose a team")

        required_size = self.state.get_team_size_required()
        if len(team_members) != required_size:
            raise ValueError(f"Team must have exactly {required_size} members")

        # Validate all members are valid players
        player_ids = [p.user_id for p in self.state.players]
        for member in team_members:
            if member not in player_ids:
                raise ValueError(f"Invalid team member: {member}")

        # Check for duplicates
        if len(set(team_members)) != len(team_members):
            raise ValueError("Team members must be unique")

        self.state.proposed_team = team_members
        self.state.team_votes = {}
        self.state.phase = AvalonPhase.TEAM_VOTE

        return {
            "success": True,
            "proposed_team": team_members,
            "phase": self.state.phase.value,
        }

    def vote_team(self, player_id: int, approve: bool) -> dict:
        """
        Player votes to approve or reject the proposed team.
        Returns result including whether voting is complete.
        """
        if self.state.phase != AvalonPhase.TEAM_VOTE:
            raise ValueError("Not in team vote phase")

        if player_id in self.state.team_votes:
            raise ValueError("Player has already voted")

        if not self._get_player(player_id):
            raise ValueError("Invalid player")

        self.state.team_votes[player_id] = approve

        # Check if all players have voted
        if len(self.state.team_votes) == len(self.state.players):
            return self._resolve_team_vote()

        return {
            "success": True,
            "votes_count": len(self.state.team_votes),
            "total_players": len(self.state.players),
            "voting_complete": False,
        }

    def _resolve_team_vote(self) -> dict:
        """Resolve the team vote after all players have voted"""
        approve_count = sum(1 for v in self.state.team_votes.values() if v)
        reject_count = len(self.state.team_votes) - approve_count

        # Team is approved if majority approves
        approved = approve_count > reject_count

        if approved:
            # Team approved - move to mission phase
            self.state.phase = AvalonPhase.MISSION
            self.state.mission_votes = {}
            self.state.vote_track = 0  # Reset vote track

            return {
                "success": True,
                "voting_complete": True,
                "team_approved": True,
                "approve_count": approve_count,
                "reject_count": reject_count,
                "votes": self.state.team_votes,
                "phase": self.state.phase.value,
            }
        else:
            # Team rejected
            self.state.vote_track += 1

            # Check for 5 consecutive rejections (evil wins)
            if self.state.vote_track >= 5:
                self.state.winner_team = AvalonTeam.EVIL
                self.state.phase = AvalonPhase.GAME_OVER
                return {
                    "success": True,
                    "voting_complete": True,
                    "team_approved": False,
                    "approve_count": approve_count,
                    "reject_count": reject_count,
                    "votes": self.state.team_votes,
                    "vote_track": self.state.vote_track,
                    "game_over": True,
                    "winner_team": AvalonTeam.EVIL.value,
                    "reason": "five_rejections",
                    "phase": self.state.phase.value,
                }

            # Move to next leader
            self._advance_leader()
            self.state.proposed_team = []
            self.state.team_votes = {}
            self.state.phase = AvalonPhase.TEAM_SELECTION

            return {
                "success": True,
                "voting_complete": True,
                "team_approved": False,
                "approve_count": approve_count,
                "reject_count": reject_count,
                "votes": self.state.team_votes,
                "vote_track": self.state.vote_track,
                "new_leader_id": self.state.get_current_leader_id(),
                "phase": self.state.phase.value,
            }

    def _advance_leader(self):
        """Move to the next leader (clockwise)"""
        self.state.current_leader_index = (self.state.current_leader_index + 1) % len(self.state.players)

    def vote_mission(self, player_id: int, success: bool) -> dict:
        """
        Mission team member votes success or fail.
        Good team must vote success. Evil team can choose.
        """
        if self.state.phase != AvalonPhase.MISSION:
            raise ValueError("Not in mission phase")

        if player_id not in self.state.proposed_team:
            raise ValueError("Player is not on the mission team")

        if player_id in self.state.mission_votes:
            raise ValueError("Player has already voted")

        player = self._get_player(player_id)
        if not player:
            raise ValueError("Invalid player")

        # Good team must vote success
        if player.team == AvalonTeam.GOOD and not success:
            raise ValueError("Good team members must vote success")

        self.state.mission_votes[player_id] = success

        # Check if all team members have voted
        if len(self.state.mission_votes) == len(self.state.proposed_team):
            return self._resolve_mission()

        return {
            "success": True,
            "votes_count": len(self.state.mission_votes),
            "team_size": len(self.state.proposed_team),
            "mission_complete": False,
        }

    def _resolve_mission(self) -> dict:
        """Resolve the mission after all team members have voted"""
        fail_count = sum(1 for v in self.state.mission_votes.values() if not v)
        fail_requirement = self.state.get_fail_requirement()

        mission_success = fail_count < fail_requirement

        # Record mission result
        result_str = "success" if mission_success else "fail"
        completed_round = self.state.current_round  # Save before any changes
        self.state.mission_results[completed_round - 1] = result_str

        if mission_success:
            self.state.success_count += 1
        else:
            self.state.fail_count += 1

        # Save to history (votes shuffled to hide who voted what)
        votes_list = list(self.state.mission_votes.values())
        random.shuffle(votes_list)

        mission_record = MissionResult(
            round=completed_round,
            team_size=len(self.state.proposed_team),
            leader_id=self.state.get_current_leader_id(),
            team=self.state.proposed_team.copy(),
            team_votes=self.state.team_votes.copy(),
            mission_votes=votes_list,
            result=result_str,
        )
        self.state.mission_history.append(mission_record)

        # Check for game end
        if self.state.success_count >= 3:
            # Good team wins 3 missions - but evil can still assassinate Merlin
            self.state.phase = AvalonPhase.ASSASSINATION
            return {
                "success": True,
                "mission_complete": True,
                "round": completed_round,
                "mission_result": result_str,
                "fail_count": fail_count,
                "fail_requirement": fail_requirement,
                "success_total": self.state.success_count,
                "fail_total": self.state.fail_count,
                "phase": self.state.phase.value,
                "mission_votes_shuffled": votes_list,
            }

        if self.state.fail_count >= 3:
            # Evil team wins
            self.state.winner_team = AvalonTeam.EVIL
            self.state.phase = AvalonPhase.GAME_OVER
            return {
                "success": True,
                "mission_complete": True,
                "round": completed_round,
                "mission_result": result_str,
                "fail_count": fail_count,
                "fail_requirement": fail_requirement,
                "success_total": self.state.success_count,
                "fail_total": self.state.fail_count,
                "game_over": True,
                "winner_team": AvalonTeam.EVIL.value,
                "reason": "three_failed_missions",
                "phase": self.state.phase.value,
                "mission_votes_shuffled": votes_list,
            }

        # Continue to next round
        self.state.current_round += 1
        self._advance_leader()
        self.state.proposed_team = []
        self.state.team_votes = {}
        self.state.mission_votes = {}
        self.state.phase = AvalonPhase.TEAM_SELECTION

        return {
            "success": True,
            "mission_complete": True,
            "round": completed_round,
            "mission_result": result_str,
            "fail_count": fail_count,
            "fail_requirement": fail_requirement,
            "success_total": self.state.success_count,
            "fail_total": self.state.fail_count,
            "next_round": self.state.current_round,
            "new_leader_id": self.state.get_current_leader_id(),
            "phase": self.state.phase.value,
            "mission_votes_shuffled": votes_list,
        }

    def assassinate(self, assassin_id: int, target_id: int) -> dict:
        """
        Assassin attempts to kill Merlin.
        """
        if self.state.phase != AvalonPhase.ASSASSINATION:
            raise ValueError("Not in assassination phase")

        assassin = self._get_player(assassin_id)
        if not assassin or assassin.role != AvalonRole.ASSASSIN:
            raise ValueError("Only the assassin can assassinate")

        target = self._get_player(target_id)
        if not target:
            raise ValueError("Invalid target")

        if target.team != AvalonTeam.GOOD:
            raise ValueError("Can only assassinate good team members")

        self.state.assassination_target = target_id
        self.state.phase = AvalonPhase.GAME_OVER

        if target.role == AvalonRole.MERLIN:
            # Assassin killed Merlin - Evil wins!
            self.state.winner_team = AvalonTeam.EVIL
            return {
                "success": True,
                "assassination_target": target_id,
                "merlin_killed": True,
                "winner_team": AvalonTeam.EVIL.value,
                "reason": "merlin_assassinated",
                "phase": self.state.phase.value,
            }
        else:
            # Assassin missed - Good wins!
            self.state.winner_team = AvalonTeam.GOOD
            return {
                "success": True,
                "assassination_target": target_id,
                "merlin_killed": False,
                "winner_team": AvalonTeam.GOOD.value,
                "reason": "merlin_survived",
                "phase": self.state.phase.value,
            }

    def get_game_result(self) -> dict:
        """Get the final game result with all roles revealed"""
        if self.state.phase != AvalonPhase.GAME_OVER:
            raise ValueError("Game is not over")

        return {
            "winner_team": self.state.winner_team.value if self.state.winner_team else None,
            "players": [p.to_dict() for p in self.state.players],  # Full info with roles
            "mission_results": self.state.mission_results,
            "mission_history": [m.to_dict() for m in self.state.mission_history],
            "assassination_target": self.state.assassination_target,
        }

    def get_full_state(self) -> dict:
        """Get the complete game state (for storage)"""
        return {
            "game_id": self.state.game_id,
            "room_id": self.state.room_id,
            "players": [p.to_dict() for p in self.state.players],
            "phase": self.state.phase.value,
            "current_round": self.state.current_round,
            "current_leader_index": self.state.current_leader_index,
            "vote_track": self.state.vote_track,
            "mission_results": self.state.mission_results,
            "success_count": self.state.success_count,
            "fail_count": self.state.fail_count,
            "proposed_team": self.state.proposed_team,
            "team_votes": self.state.team_votes,
            "mission_votes": self.state.mission_votes,
            "mission_history": [m.to_dict() for m in self.state.mission_history],
            "winner_team": self.state.winner_team.value if self.state.winner_team else None,
            "assassination_target": self.state.assassination_target,
        }

    @classmethod
    def from_state(cls, state_dict: dict) -> "AvalonGame":
        """Restore game from stored state"""
        game = cls(state_dict["game_id"], state_dict["room_id"])

        game.state.players = [
            AvalonPlayer(
                user_id=p["user_id"],
                username=p["username"],
                display_name=p["display_name"],
                role=AvalonRole(p["role"]) if p.get("role") else None,
                team=AvalonTeam(p["team"]) if p.get("team") else None,
            )
            for p in state_dict["players"]
        ]

        game.state.phase = AvalonPhase(state_dict["phase"])
        game.state.current_round = state_dict["current_round"]
        game.state.current_leader_index = state_dict["current_leader_index"]
        game.state.vote_track = state_dict["vote_track"]
        game.state.mission_results = state_dict["mission_results"]
        game.state.success_count = state_dict["success_count"]
        game.state.fail_count = state_dict["fail_count"]
        game.state.proposed_team = state_dict["proposed_team"]
        game.state.team_votes = {int(k): v for k, v in state_dict["team_votes"].items()}
        game.state.mission_votes = {int(k): v for k, v in state_dict["mission_votes"].items()}

        game.state.mission_history = [
            MissionResult(
                round=m["round"],
                team_size=m["team_size"],
                leader_id=m["leader_id"],
                team=m["team"],
                team_votes={int(k): v for k, v in m["team_votes"].items()},
                mission_votes=m.get("mission_votes"),
                result=m.get("result"),
            )
            for m in state_dict.get("mission_history", [])
        ]

        if state_dict.get("winner_team"):
            game.state.winner_team = AvalonTeam(state_dict["winner_team"])
        game.state.assassination_target = state_dict.get("assassination_target")

        return game


# In-memory cache for active games (backed by Redis for persistence)
_active_games: dict[int, AvalonGame] = {}


def get_game(game_id: int) -> Optional[AvalonGame]:
    """Get an active game by ID from memory cache"""
    return _active_games.get(game_id)


async def get_game_async(game_id: int) -> Optional[AvalonGame]:
    """Get an active game by ID, checking Redis if not in memory"""
    from app.db.redis import redis_client

    # Check memory cache first
    if game_id in _active_games:
        return _active_games[game_id]

    # Try to restore from Redis
    state = await redis_client.get_game_state(game_id)
    if state:
        game = AvalonGame.from_state(state)
        _active_games[game_id] = game
        return game

    return None


def create_game(game_id: int, room_id: int, players: list[dict]) -> AvalonGame:
    """Create and initialize a new game"""
    game = AvalonGame(game_id, room_id)
    game.initialize_game(players)
    _active_games[game_id] = game
    return game


async def save_game(game: AvalonGame):
    """Save game state to Redis for persistence"""
    from app.db.redis import redis_client

    state = game.get_full_state()
    await redis_client.save_game_state(game.state.game_id, state)
    # Also map room to game ID for reconnection
    await redis_client.set_room_game_id(str(game.state.room_id), game.state.game_id)


def remove_game(game_id: int):
    """Remove a game from memory cache"""
    if game_id in _active_games:
        del _active_games[game_id]


async def remove_game_async(game_id: int, room_id: str = None):
    """Remove a game from memory and Redis"""
    from app.db.redis import redis_client

    if game_id in _active_games:
        if room_id is None:
            room_id = str(_active_games[game_id].state.room_id)
        del _active_games[game_id]

    await redis_client.delete_game_state(game_id)
    if room_id:
        await redis_client.delete_room_game_id(room_id)


async def get_game_by_room(room_id: str) -> Optional[AvalonGame]:
    """Get active game for a room (for reconnection)"""
    from app.db.redis import redis_client

    game_id = await redis_client.get_room_game_id(room_id)
    if game_id:
        return await get_game_async(game_id)
    return None
