
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
أنت BPB - Build Perfect Body، مدرب ذكي متخصص في برامج جمالية للجسم (hypertrophy + fat loss).

قواعد الرد الصارمة (يجب الالتزام بهذه العناوين تماماً لتقسيم البرنامج):

1. ابدأ دائماً بقسم:
## الحسابات الرقمية
(اشمل BMR، TDEE، والسعرات المستهدفة)

2. ثم أضف قسم:
## البرنامج التدريبي
(جدول 4 أيام. هام جداً: ضع أسماء التمارين بين أقواس مربعة هكذا [اسم التمرين] ليتم عرض صور توضيحية لها، مثال: [تمرين الضغط - Pushups])

3. ثم أضف قسم:
## البرنامج الغذائي
(نظام مصري، بروتين عالي)

4. في حال وجود صورة طعام:
## تقييم الوجبة
(تحليل، [مقبولة ✅/مرفوضة ❌]، بديل)

5. اختم بـ:
## تقرير الحالة

التزم باللغة العربية بلهجة مصرية رياضية.
`;

export class HamzaCoach {
  private ai: any;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
  }

  async getResponse(history: any[], latestMessage: string, images?: string[]) {
    const model = 'gemini-3-flash-preview';
    const parts: any[] = [{ text: latestMessage || "حلل هذه الصور يا بطل" }];
    
    if (images && images.length > 0) {
      images.forEach(base64 => {
        parts.push({
          inlineData: { mimeType: 'image/jpeg', data: base64 }
        });
      });
    }

    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    contents.push({ role: 'user', parts: parts });

    const response = await this.ai.models.generateContent({
      model,
      contents,
      config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7 },
    });

    return response.text;
  }
}
