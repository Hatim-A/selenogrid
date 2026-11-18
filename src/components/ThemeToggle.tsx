import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: 'light' | 'dark'
  onToggle: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-keyshortcuts="T"
          title={`${theme === 'dark' ? 'Light' : 'Dark'} appearance (T)`}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {theme === 'dark' ? 'Light appearance' : 'Dark appearance'}
        <span className="ml-1.5 font-mono text-[10px] opacity-60">T</span>
      </TooltipContent>
    </Tooltip>
  )
}
