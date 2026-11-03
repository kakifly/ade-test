import { Injectable, type PipeTransform } from "@nestjs/common";
import { AppError } from "./app-error";

// zod スキーマの safeParse だけを使う最小の型（検証規則は @habit/zod に一本化し、ここでは再記述しない）
interface Parsable<T> {
  safeParse(
    value: unknown,
  ): { success: true; data: T } | { success: false; error: { issues: readonly { message: string }[] } };
}

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: Parsable<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    // 検証に失敗したら、最初のメッセージを返して400にする
    if (!result.success) {
      throw new AppError(400, "VALIDATION_ERROR", result.error.issues[0]?.message ?? "入力が正しくありません");
    }
    return result.data;
  }
}
