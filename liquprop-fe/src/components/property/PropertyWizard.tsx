import * as Progress from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

interface PropertyWizardProps {
  steps: string[]
  currentStep: number
  children: React.ReactNode
}

export function PropertyWizard({ steps, currentStep, children }: PropertyWizardProps) {
  const progress = ((currentStep) / steps.length) * 100

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-primary">{steps[currentStep]}</span>
        </div>

        {/* Progress bar */}
        <Progress.Root
          className="relative h-3 w-full overflow-hidden rounded-full border-2 border-foreground bg-muted"
          value={progress}
        >
          <Progress.Indicator
            className="h-full bg-primary transition-all duration-500 ease-bouncy"
            style={{ width: `${progress}%` }}
          />
        </Progress.Root>

        {/* Step pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {steps.map((step, i) => (
            <div
              key={i}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold transition-all',
                i < currentStep
                  ? 'border-primary bg-primary text-white'
                  : i === currentStep
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-foreground/20 bg-muted text-muted-foreground',
              )}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                {i < currentStep ? '✓' : i + 1}
              </span>
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-2xl border-2 border-foreground bg-card p-6 shadow-pop">
        {children}
      </div>
    </div>
  )
}
