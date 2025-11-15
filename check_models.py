import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("❌ GEMINI_API_KEY not found in .env file")
    exit(1)

genai.configure(api_key=GEMINI_API_KEY)

print("\n" + "="*70)
print("🔍 AVAILABLE GEMINI MODELS")
print("="*70 + "\n")

try:
    models_found = False
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            models_found = True
            print(f"✓ Model Name: {m.name}")
            print(f"  Display Name: {m.display_name}")
            print(f"  Description: {m.description}")
            print(f"  Supported Methods: {m.supported_generation_methods}")
            print("-" * 70)
    
    if not models_found:
        print("❌ No models found that support generateContent")
        
except Exception as e:
    print(f"❌ Error listing models: {str(e)}")
    print("\nPossible issues:")
    print("1. Invalid API key")
    print("2. API key doesn't have proper permissions")
    print("3. Network connection issue")
    print("4. Incorrect google-generativeai version")
    print("\nTry:")
    print("  pip install --upgrade google-generativeai")

print("\n" + "="*70)
print("💡 RECOMMENDED MODEL NAMES TO USE:")
print("="*70)
print("  - gemini-1.5-flash-latest")
print("  - gemini-1.5-pro-latest")
print("  - gemini-pro")
print("="*70 + "\n")