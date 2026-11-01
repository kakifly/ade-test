import { zodResolver } from '@hookform/resolvers/zod'
import { createHabitFormSchema, type CreateHabitForm } from '@habit/schemas'
import { useForm } from 'react-hook-form'

type Props = {
  /** 失敗したときはエラー文を返す（欄の下に表示する）。成功なら何も返さない */
  onSubmit: (name: string) => Promise<string | void>
  disabled?: boolean
}

export function HabitForm({ onSubmit, disabled = false }: Props) {
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

  const submit = handleSubmit(async (values) => {
    const message = await onSubmit(values.name)
    if (message) {
      // サーバー側の検証（同名など）の失敗を欄の下に出す
      setError('name', { type: 'server', message })
      return
    }
    reset()
  })

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
