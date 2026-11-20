import { GameResultPayload } from '../components/GameShell';
import { RegionId } from '../types';

export interface GameComponentProps {
  region: RegionId;
  seedOffset: number;
  isPaused: boolean;
  juniorMode?: boolean;
  playerName?: string;
  favoriteClub?: string;
  initialRoomCode?: string | null;
  onScoreChange: (score: number, statusText?: string) => void;
  onFinish: (result: GameResultPayload) => void;
}
