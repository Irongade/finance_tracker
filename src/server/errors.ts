/** Typed domain errors (section 6.1). Controllers map these to HTTP; nothing else throws them. */

export class NotFoundError extends Error {
  readonly kind = "not_found" as const;
  constructor(entity: string, id?: string) {
    super(id ? `${entity} ${id} not found` : `${entity} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  readonly kind = "conflict" as const;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class DomainRuleError extends Error {
  readonly kind = "domain_rule" as const;
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "DomainRuleError";
  }
}

export class ForbiddenError extends Error {
  readonly kind = "forbidden" as const;
  constructor(message = "Not allowed") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  readonly kind = "unauthorized" as const;
  constructor(message = "Sign in required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export type DomainError = NotFoundError | ConflictError | DomainRuleError | ForbiddenError | UnauthorizedError;

export function isDomainError(e: unknown): e is DomainError {
  return (
    e instanceof NotFoundError ||
    e instanceof ConflictError ||
    e instanceof DomainRuleError ||
    e instanceof ForbiddenError ||
    e instanceof UnauthorizedError
  );
}
