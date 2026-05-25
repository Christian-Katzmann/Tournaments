# Methodologies

A *methodology* is how the tournament reaches a verdict from many judgments.
Six at launch. The right one depends on candidate count, the question you are
asking, and how much patience you have.

## elo-pairwise

Show two candidates side by side. You pick one. Repeat. Each pair's rating
moves by an adaptive K (40 early, 24 mid, 16 late). Matchmaking has three
phases — coverage (every pair seen), stabilization (tighten close ratings),
refinement (focus on the top). Counterbalanced left/right, never the same pair
twice in a row. Best for 20–60 candidates where ranking matters more than
finding a single winner.

## bradley-terry

A maximum-likelihood ranking from any pile of pairwise judgments. Useful
for tournaments where matches aren't perfectly balanced. Slower
convergence than Elo but produces a tighter posterior. Best for "we already
have the votes — what's the ranking?" rather than active judging.

## bracket-4-seed

Four candidates, single-elimination. Two semifinals, one final. Fastest path
to "the one." Best for shortlist decisions where you already know the four
finalists and want a definitive winner in three rounds.

## best-of-n

Compare candidates in groups of N (2–6 per round). Pick the best in each
group; the chosen ones survive. Good when pairwise feels too granular and
you trust your eye to scan a row. Works for images, code samples, and ai-output
where context-in-context matters.

## multi-axis

Score each candidate independently on N labeled axes (e.g. "clarity", "tone",
"persuasiveness"). No comparisons — direct rating. Best when the question is
"which qualities are weak across all candidates" rather than "which is best."

## slider

A single continuous score per candidate. Min/max/step configurable. No
comparisons, no ranking math — just numbers you can sort by. Best when you
want subjective intensity recorded (mood, intensity, vibe) without committing
to a winner.
