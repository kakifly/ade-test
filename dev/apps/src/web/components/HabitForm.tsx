import { zodResolver } from '@hookform/resolvers/zod'
import { createHabitFormSchema, type CreateHabitForm } from '@habit/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../ui/Button'
import { FieldError } from '../ui/FieldError'
import { Input } from '../ui/Input'

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
    <form onSubmit={submit} noValidate>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="habit-name">
            習慣名
          </label>
          <Input
            id="habit-name"
            invalid={Boolean(error)}
            placeholder="習慣名を入力"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'habit-name-error' : undefined}
            disabled={disabled}
            {...register('name')}
          />
        </div>
        <Button type="submit" disabled={disabled}>
          追加
        </Button>
      </div>
      {error && (
        <FieldError id="habit-name-error">{error}</FieldError>
      )}
    </form>
  )
}
