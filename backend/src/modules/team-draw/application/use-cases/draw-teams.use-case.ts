import type { UnitOfWork } from '../../../../shared/domain/unit-of-work.js';
import type { Actor, Runtime } from '../../../../shared/domain/types.js';
import { access } from '../../../../shared/application/access.js';
import { drawTeams } from '../../domain/entities/draw.js';
export class DrawTeamsUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(
    actor: Actor,
    groupId: string,
    input: {
      teamCount: number;
      playersPerTeam: number;
      hasGoalkeepers: boolean;
      players: { id?: string; name: string; goalkeeper: boolean }[];
    },
  ) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId);
      return drawTeams(
        {
          ...input,
          players: input.players.map((player) => ({
            ...player,
            id: player.id ?? this.runtime.id(),
          })),
        },
        this.runtime,
      );
    });
  }
}
