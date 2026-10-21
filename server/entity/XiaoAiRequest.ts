export interface XiaoAiRequest {
  version: string
  session: {
    is_new: boolean
    session_id: string
    application?: { app_id: string }
    user?: Record<string, unknown>
  }
  request: {
    request_id?: string
    timestamp?: number
    intent: {
      query: string
      slots: string
    }
  }
  query: string
  context?: Record<string, unknown>
  capabilities?: Array<Record<string, unknown>>
}

export interface XiaoAiIntentSlots {
  intent_name: string
  slots?: Array<{
    name: string
    value: string
    raw_value: string
  }>
}

export interface XiaoAiJsonResponse {
  version: '1.0'
  is_session_end: boolean
  response: {
    to_speak: {
      text: string
      type: 0
    }
    to_display: {
      ui_type: 'phone'
      phone_template: {
        template_name: 'default_card'
        params: Record<string, unknown>
      }
    }
    open_mic: boolean
    not_understand: boolean
  }
}
