import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
أنت BPB - Build Perfect Body، مدرب ذكي متخصص في برامج جمالية للجسم (hypertrophy + fat loss).

قواعد الرد الصارمة (يجب الالتزام بهذه العناوين تماماً لتقسيم البرنامج):

1. ابدأ دائماً بقسم:
## الحسابات الرقمية
(اشمل BMR، TDEE، والسعرات المستهدفة)

2. ثم أضف قسم:
## البرنامج التدريبي
(جدول 4 أيام. هام جداً: ضع أسماء التمارين بين أقواس مربعة هكذا [اسم التمرين] ليتمكن النظام من توليد صور لها، مثال: [تمرين الضغط - Pushups])

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
  private ai: GoogleGenAI;

  constructor() {
    // استخدم نفس الاسم اللي في Vercel: GEMINI_API_KEY
    const apiKey = (process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY / API_KEY");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async getResponse(history: any[], latestMessage: string, images?: string[]) {
    const model = "gemini-3.5-flash"; // موديل نص ثابت وحديث
    const parts: any[] = [{ text: latestMessage || "حلل هذه الصور يا بطل" }];

    if (images && images.length > 0) {
      images.forEach((base64) => {
        parts.push({
          inlineData: { mimeType: "image/jpeg", data: base64 },
        });
      });
    }

    const contents = history.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    contents.push({ role: "user", parts });

    const response = await this.ai.models.generateContent({
      model,
      contents,
      config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7 },
    });

    return response.text;
  }

  async generateExerciseImage(exerciseName: string): Promise<string | null> {
    // تم تعطيل توليد صور التمارين مؤقتًا بسبب مشكلة الكوتا على موديل الصور
    console.warn(
      "Image generation disabled (quota for gemini-2.5-flash-preview-image). Skipping:",
      exerciseName
    );
    return null;

    /*
    // الكود الأصلي للاستخدام لاحقًا بعد حل الكوتا أو تفعيل billing:
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-image",
        contents: {
          parts: [
            {
              text: `Minimalist 3D clay render of a person performing ${exerciseName} exercise, clean professional fitness illustration, emerald green and dark slate color palette, studio lighting, high resolution, isolated on solid dark background, hypertrophy training focus.`,
            },
          ],
        },
        config: {
          imageConfig: { aspectRatio: "1:1" },
        },
      });

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if ((part as any).inlineData?.data) {
          return `data:image/png;base64,${(part as any).inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Image generation failed:", error);
      return null;
    }
    */
  }
}
