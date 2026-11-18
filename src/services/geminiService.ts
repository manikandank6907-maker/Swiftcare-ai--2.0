import { LanguageCode } from '../types';

export interface AssistantResponse {
  text: string;
  isEmergency: boolean;
  suggestedPrompts?: string[];
}

const EMERGENCY_KEYWORDS = [
  'chest pain',
  'heart attack',
  'shortness of breath',
  'cannot breathe',
  'difficulty breathing',
  'stroke',
  'facial drooping',
  'paralysis',
  'unconscious',
  'bleeding heavily',
  'severe trauma',
  'suicide',
  'kill myself',
  'overdose',
  'dolor en el pecho',
  'no puedo respirar',
  'douleur thoracique',
  'étouffement',
  'brustschmerzen',
  'atemnot',
  'dolore toracico',
  'falta de ar',
  'सीने में दर्द',
  'सांस लेने में दिक्कत',
  'நெஞ்சு வலி',
  'ألم في الصدر',
  'ضيق في التنفس',
  '胸痛',
  '呼吸困难',
  '息苦しい',
  '흉통',
  '호흡곤란',
];

export async function askAssistant(
  userMessage: string,
  language: LanguageCode = 'en-US'
): Promise<AssistantResponse> {
  const lowerMsg = userMessage.toLowerCase();
  const isEmergency = EMERGENCY_KEYWORDS.some((kw) => lowerMsg.includes(kw));

  if (isEmergency) {
    return {
      text: `🚨 **IMMEDIATE EMERGENCY WARNING:**\n\nIf you or someone nearby is experiencing severe chest pain, shortness of breath, sudden numbness, uncontrolled bleeding, or loss of consciousness, **please call 911 (or your local emergency number like 112, 999, or 108) or go to the nearest Emergency Department immediately.**\n\n*Important:* SwiftCare AI is a discovery and booking-request platform for non-life-threatening healthcare appointments. We do **not** dispatch ambulances or provide emergency medical services.`,
      isEmergency: true,
      suggestedPrompts: [
        'What conditions can Urgent Care handle instead?',
        'How do I find non-emergency walk-in care?',
        'What is SwiftCare AI?',
      ],
    };
  }

  // Attempt server-side Gemini endpoint
  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage, language }),
    });

    if (res.ok) {
      const data = await res.json();
      if (!data.fallback && data.reply) {
        return {
          text: data.reply,
          isEmergency: false,
          suggestedPrompts: getSuggestedFollowups(userMessage),
        };
      }
    }
  } catch (err) {
    console.warn('Backend assistant API unavailable, utilizing clinical knowledge base.', err);
  }

  // Fallback intelligent clinical navigation engine
  return getClinicalFallbackReply(userMessage, language);
}

function getSuggestedFollowups(msg: string): string[] {
  const lower = msg.toLowerCase();
  if (lower.includes('urgent') || lower.includes('er') || lower.includes('emergency')) {
    return [
      'Find urgent care with slots within 30 minutes',
      'What are common walk-in clinic wait times?',
      'Can I request a telehealth visit instead?',
    ];
  }
  if (lower.includes('telehealth') || lower.includes('virtual')) {
    return [
      'How fast can a telehealth doctor see me?',
      'What symptoms are eligible for telehealth?',
      'Show me available telehealth slots today',
    ];
  }
  return [
    'What is the difference between Urgent Care and Primary Care?',
    'How does SwiftCare AI booking confirmation work?',
    'Find nearby clinics with same-day appointments',
  ];
}

function getClinicalFallbackReply(userMessage: string, language: LanguageCode): AssistantResponse {
  const lower = userMessage.toLowerCase();

  // Urgent Care vs Emergency Room
  if (lower.includes('difference') || lower.includes('urgent care') || lower.includes('er') || lower.includes('emergency room')) {
    return {
      text: `### Urgent Care vs. Emergency Room (ER)

• **Urgent Care Centers:** Best for non-life-threatening illnesses and injuries that need prompt evaluation when your primary doctor is unavailable. Examples: sprains, minor fractures, cuts requiring stitches, mild burns, ear infections, urinary infections, and flu testing.
• **Emergency Rooms (ER):** For severe, potentially life-threatening emergencies requiring hospital admission, surgical intervention, or advanced intensive care. Examples: chest pain, stroke symptoms, major trauma, severe burns, or severe poisoning.
• **SwiftCare AI Tip:** If your condition is stable but urgent, you can use our filters to find urgent care clinics with openings within 30 minutes or 1 hour.`,
      isEmergency: false,
      suggestedPrompts: [
        'Find urgent care with slots within 30 minutes',
        'Can urgent care centers do X-rays?',
        'How does booking confirmation work?',
      ],
    };
  }

  // Booking Confirmation process
  if (lower.includes('how') || lower.includes('confirm') || lower.includes('booking') || lower.includes('work') || lower.includes('process')) {
    return {
      text: `### How SwiftCare AI Booking Works

1. **Discover Earlier Slots:** Search by your ZIP code or city to see healthcare providers near you that have open appointment slots today or within the hour.
2. **Submit a Request:** Select a preferred time and provide your contact information and reason for visit.
3. **Pending Human Review:** Your request is marked as **Pending Human Confirmation**. SwiftCare AI sends your request directly to the clinic's reception staff.
4. **Staff Approval:** The clinic reviews their real-time chair/room availability and confirms or proposes an adjusted slot. You can track your status anytime under **My Requests**.
5. **No Medical Guarantees:** SwiftCare AI is a scheduling optimization platform. Actual appointments are confirmed exclusively by the medical provider's staff.`,
      isEmergency: false,
      suggestedPrompts: [
        'Track my appointment request',
        'Show me primary care providers near me',
        'What insurance plans are accepted in demo data?',
      ],
    };
  }

  // Telehealth guidance
  if (lower.includes('telehealth') || lower.includes('virtual') || lower.includes('video') || lower.includes('online')) {
    return {
      text: `### Telehealth & Virtual Consultations on SwiftCare AI

• **Best For:** Rashes, cold and allergy symptoms, pink eye, routine medication refills, lab reviews, and general health inquiries.
• **Fastest Access:** Virtual providers on SwiftCare AI often offer appointments within 15 minutes.
• **Equipment Needed:** A smartphone, tablet, or computer with a working camera and microphone.
• **Limitation:** Virtual physicians cannot perform hands-on physical exams, suture wounds, or conduct physical X-rays. For those, choose an **In-Person Urgent Care** or **Home Visit** provider.`,
      isEmergency: false,
      suggestedPrompts: [
        'Find virtual care available right now',
        'What are the typical telehealth fees?',
        'Can telehealth doctors prescribe medication?',
      ],
    };
  }

  // Default helpful response
  const greetings: Record<string, string> = {
    es: `Hola. Soy el asistente de navegación médica de **SwiftCare AI**. Le ayudo a comprender los tipos de atención médica, localizar clínicas cercanas y solicitar citas tempranas sin esperas innecesarias. ¿Qué tipo de atención necesita hoy?`,
    fr: `Bonjour. Je suis l'assistant de navigation médicale de **SwiftCare AI**. Je vous aide à comprendre les catégories de soins, trouver des créneaux rapides et faire des demandes de rendez-vous. De quels soins avez-vous besoin aujourd'hui ?`,
    de: `Hallo. Ich bin der SwiftCare AI Buchungsassistent. Ich helfe Ihnen dabei, passende Praxen in Ihrer Nähe zu finden und frühere freie Termine anzufragen. Wie kann ich Ihnen heute helfen?`,
    it: `Buongiorno. Sono l'assistente di navigazione sanitaria di **SwiftCare AI**. Ti aiuto a trovare visite mediche anticipate e a inviare richieste di prenotazione. Di quale visita hai bisogno?`,
    pt: `Olá. Sou o assistente de cuidados de saúde do **SwiftCare AI**. Posso ajudar a encontrar vagas antecipadas em clínicas e urgências próximas. Como posso ajudar?`,
    hi: `नमस्ते! मैं SwiftCare AI का स्वास्थ्य नेविगेशन सहायक हूं। मैं आपको सही स्वास्थ्य सेवा श्रेणी चुनने और जल्द अपॉइंटमेंट पाने में मदद कर सकता हूं। आज आपको किस प्रकार की सहायता चाहिए?`,
    ta: `வணக்கம்! நான் SwiftCare AI-ன் மருத்துவ வழிகாட்டி உதவியாளர். விரைவான மருத்துவ சந்திப்புகளைக் கண்டறிய உங்களுக்கு உதவ முடியும். உங்களுக்கு என்ன உதவி தேவை?`,
    ar: `مرحباً بك. أنا المساعد الذكي لمنصة **SwiftCare AI**. أساعدك في فهم فئات الرعاية الصحية وحجز مواعيد مبكرة دون انتظار. كيف يمكنني مساعدتك اليوم؟`,
    zh: `您好！我是 **SwiftCare AI** 医疗就诊导航助手。我能协助您选择合适的就诊科室（急诊、全科门诊、远程问诊等），并指导您申请更早的就诊号源。请问您今天需要什么帮助？`,
    ja: `こんにちは。**SwiftCare AI** の医療ナビゲーションアシスタントです。急病診療、一般内科、オンライン診療などの診療区分のご案内や、早期予約リクエストのお手伝いをいたします。本日はどのような受診をご希望ですか？`,
    ko: `안녕하세요! **SwiftCare AI** 진료 안내 도우미입니다. 빠른 진료 예약이 가능한 병의원을 찾고 올바른 진료과를 선택하실 수 있도록 도와드립니다. 어떤 도움이 필요하신가요?`,
  };

  const defaultGreeting =
    greetings[language] ||
    `Hello! I am your **SwiftCare AI Care Navigation Assistant**. I can help you:

1. **Understand Care Categories:** Distinguish between Urgent Care, Primary Care, Community Clinics, Home Visits, and Telehealth.
2. **Find Earlier Slots:** Guide you to nearby providers with openings within 30 minutes, 1 hour, or today.
3. **Submit Booking Requests:** Clarify the human staff confirmation process.

*Please note: I cannot diagnose conditions or prescribe medications. If you have an emergency, please call 911 immediately.*

How can I assist your healthcare search today?`;

  return {
    text: defaultGreeting,
    isEmergency: false,
    suggestedPrompts: [
      'What is the difference between Urgent Care and ER?',
      'How does booking confirmation work?',
      'Find telehealth available right now',
    ],
  };
}

export interface DocumentAnalysisRequest {
  fileName: string;
  mimeType: string;
  textContent?: string;
  base64Data?: string;
  userQuestion?: string;
  language?: LanguageCode;
}

export interface DocumentAnalysisResult {
  analysis: string;
  isEmergency: boolean;
}

export async function analyzeDriveDocument(
  request: DocumentAnalysisRequest
): Promise<DocumentAnalysisResult> {
  const combinedCheck = `${request.userQuestion || ''} ${(request.textContent || '').slice(0, 4000)}`.toLowerCase();
  const hasEmergencySignal = EMERGENCY_KEYWORDS.some((kw) => combinedCheck.includes(kw));

  const res = await fetch('/api/analyze-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: request.fileName,
      mimeType: request.mimeType,
      textContent: request.textContent,
      base64Data: request.base64Data,
      userQuestion: request.userQuestion,
      language: request.language || 'en-US',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.analysis) {
    throw new Error(
      data.error ||
        `Document analysis request failed (${res.status}). Please verify server configuration and try again.`
    );
  }

  let analysisText: string = data.analysis;
  if (hasEmergencySignal && !analysisText.toUpperCase().includes('EMERGENCY NOTICE')) {
    analysisText =
      `**EMERGENCY NOTICE:** Possible urgent/emergency warning signs detected. If you or someone nearby is experiencing chest pain, trouble breathing, stroke symptoms, or severe bleeding, call 911 (or your local emergency number) or visit the nearest Emergency Room immediately.\n\n` +
      analysisText;
  }

  return {
    analysis: analysisText,
    isEmergency: hasEmergencySignal || analysisText.toUpperCase().includes('EMERGENCY NOTICE'),
  };
}

export async function generateCarePrepReport(
  topicOrTranscript: string,
  language: LanguageCode = 'en-US'
): Promise<{ report: string; isEmergency: boolean }> {
  const prompt = `Create a structured, concise, NON-DIAGNOSTIC "Care Navigation & Appointment Preparation Report" for a patient based on the following notes or conversation:

"${topicOrTranscript}"

Include:
1. Summary of Care Goal / Visit Focus
2. Recommended SwiftCare AI Care Category (Urgent Care, Primary Care, Clinics, Home Visits, or Telehealth — and why)
3. Checklist of Items to Bring or Mention (e.g. symptom timeline, allergies, current medications list, insurance details)
4. 3 Suggested Questions for the Healthcare Provider
5. Clear reminder that this is NOT a medical diagnosis, prescription, or emergency service.`;

  const res = await askAssistant(prompt, language);
  return {
    report: res.text,
    isEmergency: res.isEmergency,
  };
}
