type Placeholders<Template extends string> = Template extends `${string}{${infer Key}}${infer Rest}`
  ? Key | Placeholders<Rest>
  : never

/** Interpolate complete translated messages; missing named values are programming errors. */
export function format<Template extends string>(
  template: Template,
  values: Record<Placeholders<Template>, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Missing translation parameter: ${key}`)
    return String((values as Record<string, string | number>)[key])
  })
}
