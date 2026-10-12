import type { Runtime } from '../../../../shared/domain/types.js';
import { invalid } from '../../../../shared/domain/errors.js';
import { text } from '../../../../shared/domain/validation.js';
export interface DrawEntry {
  id: string;
  name: string;
  goalkeeper: boolean;
}
export interface DrawInput {
  teamCount: number;
  playersPerTeam: number;
  hasGoalkeepers: boolean;
  players: DrawEntry[];
}
function shuffle<T>(input: T[], random: Pick<Runtime, 'randomInt'>): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = random.randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function drawTeams(
  input: DrawInput,
  random: Pick<Runtime, 'randomInt'>,
) {
  if (
    !Number.isInteger(input.teamCount) ||
    input.teamCount < 2 ||
    input.teamCount > 50 ||
    !Number.isInteger(input.playersPerTeam) ||
    input.playersPerTeam < 1 ||
    input.playersPerTeam > 50
  )
    invalid('Quantidade de times ou tamanho inválido.');
  const count = input.teamCount * input.playersPerTeam;
  if (count > 500 || input.players.length !== count)
    invalid(`Informe exatamente ${count} participantes (limite: 500).`);
  const players = input.players.map((player) => ({
    ...player,
    name: text(player.name, 'Nome').replace(/\s+/g, ' '),
  }));
  if (new Set(players.map((player) => player.id)).size !== count)
    invalid('Identificadores repetidos.');
  if (
    new Set(players.map((player) => player.name.toLowerCase())).size !== count
  )
    invalid('Homônimos precisam de apelidos ou identificação no nome.');
  const keepers = players.filter((player) => player.goalkeeper);
  if (
    input.hasGoalkeepers
      ? keepers.length !== input.teamCount
      : keepers.length !== 0
  )
    invalid(
      'Informe exatamente um goleiro por time ou desmarque todos os goleiros.',
    );
  const teams = Array.from({ length: input.teamCount }, (_, i) => ({
    number: i + 1,
    players: [] as DrawEntry[],
  }));
  if (input.hasGoalkeepers)
    shuffle(keepers, random).forEach((player, index) =>
      teams[index].players.push(player),
    );
  shuffle(
    input.hasGoalkeepers
      ? players.filter((player) => !player.goalkeeper)
      : players,
    random,
  ).forEach((player, index) =>
    teams[index % input.teamCount].players.push(player),
  );
  return { teams };
}
