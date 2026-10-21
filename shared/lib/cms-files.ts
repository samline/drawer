import { format, resolveConfig } from 'prettier'
import sources from '../i18n/translations/en/cms'
const options = await resolveConfig(process.cwd())
export const cmsFiles = async (host: keyof typeof sources) =>
  Promise.all(
    sources[host].map(async item => ({
      ...item,
      code:
        item.language === 'javascript' || item.language === 'css'
          ? await format(item.code, {
              ...options,
              parser: item.language === 'css' ? 'css' : 'babel',
            })
          : item.code,
    }))
  )
