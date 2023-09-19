type Action = 'App.LaunchWithAppQuickAppH5' | 'App.LaunchIntent' | 'App.LaunchQuickApp' | 'App.LaunchCard' | 'App.LaunchWithH5';
type IntentType = 'activity' | 'service' | 'broadcast';
type Gender = "unknown" | "male" | "female";
type RequestType = "Start"; // Add other possible request types if applicable
type Locale = "zh-CN"; // Add other possible locales if applicable
type DeviceCategory = "phone"; // Add other possible device categories if applicable
type UserAgent = string; // Define as a string, or add stricter rules if applicable

interface Capability {
  interface: string;
  version: string;
}

interface Session {
  is_new: boolean;
  session_id: string;
  application: {
    app_id: string;
  };
  user: {
    user_id: string;
    is_user_login: boolean;
    gender: Gender;
  };
}

interface Intent {
  query: string;
  score: number;
  complete: boolean;
  domain: string;
  confidence: number;
  skillType: string;
  sub_domain: string;
  app_id: string;
  request_type: RequestType;
  need_fetch_token: boolean;
  is_direct_wakeup: boolean;
  slots: string;
  is_qc: boolean;
  recall_method: string;
}

interface Request {
  type: number;
  request_id: string;
  timestamp: number;
  intent: Intent;
  locale: Locale;
  slot_info: {
    intent_name: string;
  };
  is_monitor: boolean;
}

interface Context {
  user_agent: UserAgent;
  device_category: DeviceCategory;
  in_exp: boolean;
  tts_vendor: string;
  client_protocol_version: string;
}

export interface XiaoAiRequest {
  version: string;
  session: Session;
  request: Request;
  query: string;
  context: Context;
  capabilities: Capability[];
}

interface ThirdAppIntentActionProperty {
  intent_type: IntentType;
  uri: string;
}

interface LaunchWithAppQuickAppH5Property {
  quick_app_path?: string;
  app_intent_info?: ThirdAppIntentActionProperty;
  app_h5_url?: string;
}

interface LaunchIntentProperty {
  app_intent_info: ThirdAppIntentActionProperty;
}

interface LaunchQuickAppProperty {
  quick_app_path: string;
}

interface LaunchCardProperty {
  card_params: Record<string, unknown>;
}

interface LaunchWithH5Property {
  app_h5_url: string;
}

type ActionProperty =
  | LaunchWithAppQuickAppH5Property
  | LaunchIntentProperty
  | LaunchQuickAppProperty
  | LaunchCardProperty
  | LaunchWithH5Property;

interface AudioItem {
  stream: {
    token: string;
    url: string;
    offset_in_milliseconds: number;
  }
}
interface TTSItem {
  type: 'text';
  text?: string;
}

interface Directive {
  type: string;
  audio_item?: AudioItem;
  tts_item?: TTSItem;
}
interface ToSpeak {
  type: number;
  text: string;
}

interface ToDisplay {
  ui_type: string;
  phone_template: {
    template_name: string;
    params: Record<string, unknown>;
  }
}

interface RegisterEvent {
  event_name: string;
}

interface Response {
  to_speak?: ToSpeak;
  to_display?: ToDisplay;
  directives?: Directive[];
  open_mic?: boolean;
  not_understand: boolean;
  action?: Action;
  action_property?: ActionProperty;
  register_events?: RegisterEvent[];
}

export interface XiaoAiJsonResponse {
  version: string;
  session_attributes?: Record<string, unknown>;
  response: Response;
  is_session_end: boolean;
}