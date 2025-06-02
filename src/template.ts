import Handlebars from 'handlebars'
import path from 'path'
import fs from 'fs'

export class TemplateReader {
  private templateCache: Record<string, HandlebarsTemplateDelegate> = {}

  async render(template_name: string, data: any): Promise<string> {
    try {
      if (!this.templateCache[template_name]) {
        const templatePath = path.join(__dirname, 'templates', `${template_name}.hbs`)
        const templateContent = await fs.promises.readFile(templatePath, 'utf-8')
        this.templateCache[template_name] = Handlebars.compile(templateContent)
      }

      return this.templateCache[template_name](data)
    } catch (error) {
      throw error
    }
  }
}
