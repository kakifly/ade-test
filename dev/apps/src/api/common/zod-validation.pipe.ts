import { Injectable, type PipeTransform } from "@nestjs/common";
import { AppError } from "./app-error";

/**
 * zod スキーマの safeParse だけを使う最小の型。
 * 検証規則は @habit/zod に一本化し、ここでは再記述しない。
 */
interface Parsable<T> {
  /**
   * 値を検証する。
   *
   * @param value 検証する値
   * @returns 成功なら変換後の値、失敗ならエラーの一覧
   */
  safeParse(
    value: unknown,
  ): { success: true; data: T } | { success: false; error: { issues: readonly { message: string }[] } };
}

/**
 * リクエストの値を zod スキーマで検証するパイプ。失敗したときは400の AppError にする。
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  /**
   * @param schema 検証に使う zod スキーマ
   */
  constructor(
    /** 検証に使うスキーマ（@habit/zod のもの） */
    private readonly schema: Parsable<T>,
  ) {}

  /**
   * 値を検証して、変換後の値を返す。
   *
   * @param value 検証する値（パラメータ、クエリ、ボディ）
   * @returns 検証を通った値
   * @throws AppError 検証に失敗したとき（400 VALIDATION_ERROR）
   */
  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    // 検証に失敗したら、最初のメッセージを返して400にする
    if (!result.success) {
      throw new AppError(400, "VALIDATION_ERROR", result.error.issues[0]?.message ?? "入力が正しくありません");
    }
    return result.data;
  }
}
