// ─── Quiet Guide scripts ─────────────────────────────────────────────────────
// Calm, short, non-diagnostic copy that the guide reads or shows for each step.
// Keep utterances brief — they should fit comfortably in one or two sentences.

export type GuideStep =
  | 'landing'
  | 'pathway'
  | 'consent'
  | 'consent-options'
  | 'consent-accessibility'
  | 'face'
  | 'voice'
  | 'scenario'
  | 'processing'
  | 'email-capture'
  | 'results'
  | 'result-pattern'
  | 'result-signal-map'
  | 'result-supportive-signals'
  | 'result-next-step'
  | 'how-it-works'
  | 'contact'

export const GUIDE_STEP_SCRIPTS: Record<GuideStep, string> = {
  landing:
    'Welcome to Quiet Signals. This reflection helps you notice pressure patterns that can be hard to put into words.',
  pathway:
    'Choose how you would like to use Quiet Signals — for yourself, or to explore organisational support.',
  consent:
    'This step explains what Quiet Signals does and does not do. It is not a diagnosis.',
  'consent-options':
    'You can choose how you want to reflect. Camera and voice are optional. Text only works too.',
  'consent-accessibility':
    'These options can make the experience calmer and easier to use.',
  face:
    'The camera check is optional. It may offer supportive context, but it does not decide your result.',
  voice:
    'The voice reflection is optional. You can speak, skip, or type instead.',
  scenario:
    'There are no right or wrong answers. Choose what feels closest to how you might respond.',
  processing:
    'Reading the quiet signals from your responses. This will only take a moment.',
  'email-capture':
    'Add your email if you would like to receive the report. You can skip this step too.',
  results:
    'This is your Quiet Signals reflection. It shows patterns, not a diagnosis.',
  'result-pattern':
    'This is the overall pattern your reflection suggests today.',
  'result-signal-map':
    'This map summarises the pressure patterns across exhaustion, mental distancing, cognitive impairment, and emotional impairment.',
  'result-supportive-signals':
    'These are optional camera or voice clues if you used them. They do not determine your result alone.',
  'result-next-step':
    'This section suggests a support pathway based on your overall pattern. It is a suggestion, not a prescription.',
  'how-it-works':
    'Here is how Quiet Signals works. Scenario responses form the core of the reflection.',
  contact:
    'You can reach the team through this contact form. We read every message.',
}

// Shorter prompts for the small panel preview (~60 chars each).
export const GUIDE_STEP_HEADLINES: Record<GuideStep, string> = {
  landing: 'Welcome to Quiet Signals',
  pathway: 'Choose your pathway',
  consent: 'Before you reflect',
  'consent-options': 'Choose how you reflect',
  'consent-accessibility': 'Accessibility options',
  face: 'Optional camera check',
  voice: 'Optional voice reflection',
  scenario: 'No right or wrong answers',
  processing: 'Reading your responses',
  'email-capture': 'Receive your report',
  results: 'Your reflection',
  'result-pattern': 'Your overall pattern',
  'result-signal-map': 'Quiet Signals Map',
  'result-supportive-signals': 'Supportive signals',
  'result-next-step': 'Suggested next step',
  'how-it-works': 'How it works',
  contact: 'Contact the team',
}

// Map an app screen name to the default guide step.
export function defaultStepForScreen(screen: string): GuideStep {
  switch (screen) {
    case 'landing':
      return 'landing'
    case 'pathway':
      return 'pathway'
    case 'consent':
      return 'consent-options'
    case 'face':
      return 'face'
    case 'voice':
      return 'voice'
    case 'scenario':
      return 'scenario'
    case 'processing':
      return 'processing'
    case 'email-capture':
      return 'email-capture'
    case 'results':
      return 'results'
    case 'how-it-works':
      return 'how-it-works'
    case 'contact':
      return 'contact'
    default:
      return 'landing'
  }
}

// Map a guide step to its preferred data-guide-target id.
export function defaultTargetForStep(step: GuideStep): string {
  switch (step) {
    case 'landing':
      return 'landing-title'
    case 'pathway':
      return 'pathway-options'
    case 'consent':
    case 'consent-options':
      return 'reflection-options'
    case 'consent-accessibility':
      return 'accessibility-panel'
    case 'face':
      return 'camera-check'
    case 'voice':
      return 'voice-check'
    case 'scenario':
      return 'scenario-question'
    case 'processing':
      return 'processing'
    case 'email-capture':
      return 'email-capture'
    case 'results':
    case 'result-pattern':
      return 'result-pattern'
    case 'result-signal-map':
      return 'signal-map'
    case 'result-supportive-signals':
      return 'supportive-signals'
    case 'result-next-step':
      return 'next-step'
    case 'how-it-works':
      return 'how-it-works'
    case 'contact':
      return 'contact'
  }
}

// Format a question + its choices into a single readable utterance.
export function formatQuestionForReading(
  question: string,
  choices: { key: string; text: string }[],
  includeChoices = false,
): string {
  if (!includeChoices) return question
  const labelled = choices
    .map((c, i) => `Option ${String.fromCharCode(65 + i)}: ${c.text}`)
    .join('. ')
  return `${question}. ${labelled}.`
}

export function formatChoicesForReading(choices: { key: string; text: string }[]): string {
  if (!choices.length) return ''
  return choices
    .map((c, i) => `Option ${String.fromCharCode(65 + i)}: ${c.text}`)
    .join('. ')
}
