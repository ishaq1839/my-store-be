export class AppError extends Error {
  public readonly statusCode: number;
  public readonly expose: boolean;

  constructor(message: string, opts: { statusCode: number; expose?: boolean }) {
    super(message);
    this.name = "AppError";
    this.statusCode = opts.statusCode;
    this.expose = opts.expose ?? this.statusCode < 500;
  }
}

