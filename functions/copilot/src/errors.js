import OpenAI from 'openai';

/**
 * The session that started the run has ended, or its JWT expired. From here
 * on, requests with the JWT act as a guest, so the run stops without
 * writing anything else.
 */
export class SessionEndedError extends Error {
  constructor(cause) {
    super('The session that started this run has ended.', { cause });
  }
}

export function isSessionError(err) {
  return err?.type === 'user_jwt_invalid' || err?.type === 'general_unauthorized_scope';
}

/** The tool result for a change that Appwrite rejected for the signed-in user. */
export function notAllowed({ detail = 'Not allowed', ...facts } = {}) {
  return {
    status: 'denied',
    detail,
    forModel: {
      error: 'not_allowed',
      message: 'Appwrite rejected this change for the signed-in user.',
      ...facts,
    },
  };
}

/**
 * Turns an Appwrite error from a tool call into a result the model can read.
 * A row the user cannot read looks exactly like a row that does not exist,
 * so the model learns nothing about records outside the user's access.
 * Anything unexpected is rethrown and fails the run.
 */
export function toToolResult(err) {
  if (isSessionError(err)) throw new SessionEndedError(err);

  if (err.type === 'row_not_found') {
    return {
      status: 'done',
      detail: 'Not found',
      forModel: { error: 'not_found', message: 'No record with this ID is available to the user.' },
    };
  }
  // Never forward Appwrite's message here: it lists the user's roles.
  if (err.type === 'user_unauthorized') return notAllowed();
  if (err.code === 400) {
    return {
      status: 'error',
      detail: 'Invalid request',
      forModel: { error: 'invalid', message: err.message },
    };
  }
  throw err;
}

/** The message stored on a failed run. It never includes raw error details. */
export function runErrorMessage(err) {
  if (err instanceof OpenAI.APIError && err.status === 402) {
    return 'The model provider rejected the request (billing).';
  }
  if (err instanceof OpenAI.APIConnectionError || err?.status === 429 || err?.status >= 500) {
    return 'The model is busy. Try again in a moment.';
  }
  return 'Scout ran into a problem. Try again.';
}
