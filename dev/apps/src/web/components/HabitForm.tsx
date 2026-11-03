import { zodResolver } from '@hookform/resolvers/zod'
import { createHabitFormSchema, type CreateHabitForm } from '@habit/zod'
import { useForm } from 'react-hook-form'

/** HabitForm の props */
type Props = {
  /** 追加が確定したときに習慣名を通知する。失敗したときはエラー文を返す（欄の下に表示する）。成功なら何も返さない */
  onSubmit: (name: string) => Promise<string | void>
  /** true の間は入力欄と追加ボタンを無効にする */
  disabled?: boolean
}

/**
 * 習慣名の入力フォームを表示する。
 * 入力は画面共通のzodスキーマで検証し、通過した名前を onSubmit で通知する。サーバー側の失敗は欄の下に出す。
 */
export function HabitForm({ onSubmit, disabled = false }: Props) {
  // ================================================================
  // 1. フォームの状態と検証
  //    検証は @habit/zod の createHabitFormSchema に一本化している。
  // ================================================================
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateHabitForm>({
    resolver: zodResolver(createHabitFormSchema),
    defaultValues: { name: '' },
  })

  // ================================================================
  // 2. 送信の処理
  //    成功したら入力欄を空に戻す。
  // ================================================================
  const submit = handleSubmit(async (values) => {
    const message = await onSubmit(values.name)
    if (message) {
      // サーバー側の検証（同名など）の失敗を欄の下に出す
      setError('name', { type: 'server', message })
      return
    }
    reset()
  })

  // ================================================================
  // 3. エラー表示の準備
  // ================================================================
  const error = errors.name?.message
  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="form__row">
        <div className="field">
          <label className="field__label" htmlFor="habit-name">
            習慣名
          </label>
          <input
            id="habit-name"
            className={error ? 'input input--error' : 'input'}
            placeholder="習慣名を入力"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'habit-name-error' : undefined}
            disabled={disabled}
            {...register('name')}
          />
        </div>
        <button type="submit" className="btn btn--primary btn--md" disabled={disabled}>
          追加
        </button>
      </div>
      {error && (
        <p id="habit-name-error" className="field__error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
