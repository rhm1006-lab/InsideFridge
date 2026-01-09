import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem, UserProfile } from "../types";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Predicts the category for a given food item name.
 */
export const predictCategory = async (
  itemName: string,
  categories: string[]
): Promise<string | null> => {
  if (!itemName) return null;
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Classify the food item "${itemName}" into exactly one of these categories: [${categories.join(", ")}].
      Return ONLY the exact category name from the list. If it fits multiple, pick the most specific one. If completely unknown, return nothing.`,
    });
    const text = response.text?.trim();
    
    // Validate if the response matches one of the categories
    // Flexible matching: check if the response includes the category or vice versa, but prefer exact match
    const exactMatch = categories.find(c => c === text);
    if (exactMatch) return exactMatch;
    
    // Fallback: check for partial match if AI was chatty (though prompt says return ONLY name)
    const partialMatch = categories.find(c => text?.includes(c));
    return partialMatch || null;
  } catch (error: any) {
    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('quota')) {
       console.warn("Gemini API quota exceeded for category prediction. Switching to manual mode.");
       return null;
    }
    console.error("Category prediction error:", error);
    return null;
  }
}

/**
 * Parses natural language input.
 */
export const parseVoiceInput = async (
  transcript: string,
  existingCategories: string[]
): Promise<any[]> => {
  try {
    const ai = getClient();
    const today = new Date().toISOString().split('T')[0];
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Today is ${today}. Extract food items from this text: "${transcript}". 
      
      For each item:
      1. Map to one of these categories: ${existingCategories.join(", ")}.
      2. If quantity is unspecified, default to 1.
      3. If an expiration context is mentioned (e.g., "expires next Friday", "until tomorrow", "good for 3 days"), calculate the date and return it as "YYYY-MM-DD".

      Return strictly a JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              category: { type: Type.STRING },
              expirationDate: { type: Type.STRING, description: "YYYY-MM-DD format" }
            },
            required: ["name", "quantity", "category"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error: any) {
    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('quota')) {
       console.warn("Gemini API quota exceeded for voice input.");
       return [];
    }
    console.error("Gemini parse error:", error);
    return [];
  }
};

/**
 * Parses a receipt image to extract food items.
 */
export const parseReceipt = async (
  base64Image: string,
  existingCategories: string[]
): Promise<any[]> => {
  try {
    const ai = getClient();
    const today = new Date().toISOString().split('T')[0];

    const prompt = `Analyze this receipt image. 
    Today's date is ${today}.
    
    [Instructions]
    1. Extract ONLY "edible FOOD items". 
       - EXCLUDE non-food items like toilet paper, napkins, detergent, plastic bags, dishes, etc.
       - EXCLUDE discounts or tax lines.
    2. For each food item:
       - Extract the name (fix OCR errors if obvious).
       - Extract quantity (default to 1 if not found).
       - Map to one of these categories: [${existingCategories.join(", ")}].
       - Suggest an Expiration Date (expirationDate) in "YYYY-MM-DD" format based on the food type (Fresh food gets shorter expiry).
       - Determine the 'storageType': Return 'freezer' if it is frozen food (ice cream, frozen dumplings, frozen meat). Return 'fridge' for everything else.
    
    Return strictly a JSON array.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              category: { type: Type.STRING },
              expirationDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
              storageType: { type: Type.STRING, enum: ['fridge', 'freezer'], description: "Recommended storage location" }
            },
            required: ["name", "quantity", "category", "storageType"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error: any) {
    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('quota')) {
       console.warn("Gemini API quota exceeded for receipt parsing.");
       return [];
    }
    console.error("Gemini receipt parse error:", error);
    return [];
  }
};

/**
 * Suggests detailed recipes based on inventory, time, and dietary restrictions.
 */
export const getRecipeSuggestions = async (
  items: FoodItem[],
  timeOfDay: string,
  userProfiles: UserProfile[]
): Promise<any[]> => {
  try {
    const ai = getClient();
    const ingredientList = items.map(i => i.name).join(", ");
    
    let restrictionsPrompt = "";
    if (userProfiles && userProfiles.length > 0) {
      restrictionsPrompt = "가족들의 식이 제한사항을 반드시 고려해줘:\n" + 
        userProfiles.map(u => `- ${u.name}: ${u.restrictions}`).join("\n");
    }

    if (!ingredientList) return [];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `현재 시각은 ${timeOfDay}입니다. 
      냉장고 보유 재료: ${ingredientList}.
      ${restrictionsPrompt}
      
      위 보유 재료를 최대한 활용하여 3가지 추천 요리를 제안해줘.
      제한사항에 걸리는 재료가 포함된다면, 해당 가족 구성원을 위한 주의사항(warning)을 꼭 적어줘.
      
      [중요 요구사항]
      1. 요리 초보자도 쉽게 따라 할 수 있도록 조리 순서(steps)를 아주 구체적이고 자세하게 설명해줘.
      2. ingredients 목록을 만들 때, '냉장고 보유 재료'에 있는 것과 없는 것을 구분해야 해.
         보유 재료에 있다면 isAvailable: true, 사야 한다면 isAvailable: false로 설정해줘. (기본 양념인 소금, 설탕, 간장, 식용유, 물은 집에 있다고 가정하고 isAvailable: true로 해줘).
      3. 'youtubeQuery' 필드에는 이 요리의 조리법을 유튜브에서 검색할 때 가장 좋은 키워드를 넣어줘. (예: "백종원 김치찌개 레시피", "간단한 계란말이 만드는 법")

      결과는 한국어로 작성하고 JSON 배열로 반환해줘.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              calories: { type: Type.INTEGER },
              matchPercentage: { type: Type.INTEGER },
              timeOfDay: { type: Type.STRING, description: "아침, 점심, 또는 저녁" },
              ingredients: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    isAvailable: { type: Type.BOOLEAN }
                  }
                } 
              },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } },
              warning: { type: Type.STRING, description: "식이 제한 관련 주의사항이 있다면 기재, 없으면 빈 문자열" },
              youtubeQuery: { type: Type.STRING, description: "Search keyword for YouTube" }
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error: any) {
    if (error.message?.includes('429') || error.status === 429 || error.message?.includes('quota')) {
       console.warn("Gemini API quota exceeded for recipes.");
       return [];
    }
    console.error("Gemini recipe error:", error);
    return [];
  }
};