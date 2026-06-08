import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function POST(req) {
    try {
        const { userAnswer, correctAnswer } = await req.json()

        if (!userAnswer || !correctAnswer) {
            return Response.json(
                { error: "userAnswer and correctAnswer are required" },
                { status: 400 }
            )
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
        })

        const prompt = `
أنت مصحح إجابات.

قارن إجابة المستخدم بالإجابة الصحيحة.

الإجابة الصحيحة:
${correctAnswer}

إجابة المستخدم:
${userAnswer}

المطلوب:
ارجع النتيجة بصيغة JSON فقط بدون أي كلام خارج JSON.

الشكل المطلوب:
{
  "score": 0,
  "status": "صحيحة / صحيحة جزئيًا / خطأ",
  "notes": ["ملاحظة 1", "ملاحظة 2"],
  "clientMessage": "رسالة قصيرة للمستخدم"
}

قواعد التصحيح:
- score من 0 إلى 100.
- لو المعنى قريب من الإجابة الصحيحة، أعطِ درجة مناسبة حتى لو الكلمات مختلفة.
- لو الإجابة ناقصة تفاصيل مهمة، اذكر ذلك في notes.
- لا تكن قاسيًا جدًا إذا المعنى صحيح.
- clientMessage يكون مختصر وواضح بالعربية.
`

        const result = await model.generateContent(prompt)
        const text = result.response.text()

        const cleanedText = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim()

        let parsed

        try {
            parsed = JSON.parse(cleanedText)
        } catch (e) {
            parsed = {
                score: 0,
                status: "خطأ",
                notes: ["تعذر قراءة نتيجة الذكاء الاصطناعي."],
                clientMessage: "حصل خطأ أثناء مراجعة الإجابة. حاول مرة أخرى.",
                raw: text,
            }
        }

        return Response.json(parsed)
    } catch (error) {
        return Response.json(
            {
                error: "Server error",
                details: error.message,
            },
            { status: 500 }
        )
    }
}
