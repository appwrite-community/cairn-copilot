const MAX_ROUNDS = 8;
// The run's JWT lasts the function timeout (180 s) plus 60 s. No new model
// request starts after this budget, so a run always ends while the JWT works.
const ROUND_BUDGET_MS = 110_000;

const NO_ANSWER = 'Scout could not put an answer together. Try asking again.';
const TOO_MANY_STEPS =
  'This request needed more steps than Scout takes in one run. Try asking about one account at a time.';

/**
 * The tool loop. The model asks for tools, Scout runs them as the user, and
 * the results go back to the model until it answers in text. Every tool call
 * becomes a step row that the web app shows while the run is in progress.
 */
export async function runAgent({ openrouter, messages, toolbox, runLog, startedAt }) {
  let rounds = 0;
  while (rounds < MAX_ROUNDS && Date.now() - startedAt < ROUND_BUDGET_MS) {
    rounds++;
    const completion = await openrouter.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-6-luna',
      messages,
      tools: toolbox.definitions,
      reasoning_effort: 'low',
    });
    const message = completion.choices?.[0]?.message;
    if (!message) throw new Error('The model returned no message.');
    if (!message.tool_calls?.length)
      return { answer: message.content?.trim() || NO_ANSWER, rounds };

    messages.push(message);
    // One call at a time, so the steps appear in the order the model asked for them.
    for (const call of message.tool_calls) {
      const step = await runLog.startStep(call.function.name, toolbox.label(call));
      const result = await toolbox.run(call);
      await runLog.finishStep(step, result);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result.forModel),
      });
    }
  }
  return { answer: TOO_MANY_STEPS, rounds };
}
