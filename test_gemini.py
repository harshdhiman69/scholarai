import google.generativeai as genai
import os
from dotenv import load_dotenv

print("\n" + "="*60)
print("🧪 TESTING GEMINI API")
print("="*60)

# Load .env
load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')

if not api_key:
    print("❌ GEMINI_API_KEY not found in .env file!")
    print("Create a .env file with: GEMINI_API_KEY=your_key_here")
    exit(1)

print(f"\n✓ API Key found: {api_key[:10]}...{api_key[-4:]}")

# Configure
genai.configure(api_key=api_key)

print("\n📋 Listing available models...\n")

try:
    available_models = []
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✓ {m.name}")
            available_models.append(m.name)
    
    if not available_models:
        print("❌ No models found! Your API key might not have access.")
        print("Try creating a new API key at: https://aistudio.google.com/app/apikey")
        exit(1)
    
    print(f"\n✓ Found {len(available_models)} models")
    
    print(f"\n🧪 Testing model: {available_models[0]}")
    
    model = genai.GenerativeModel(available_models[0])
    response = model.generate_content("Say 'Hello World!'")
    
    print(f"\n✅ SUCCESS! Model response: {response.text}")
    print("\n" + "="*60)
    print("🎉 YOUR API IS WORKING CORRECTLY!")
    print("="*60)
    print(f"\nUse this model in app.py:")
    print(f"  model = genai.GenerativeModel('{available_models[0]}')")
    print("="*60 + "\n")
    
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    print("\n🔧 Troubleshooting:")
    print("1. Get a new API key: https://aistudio.google.com/app/apikey")
    print("2. Make sure API key has no restrictions")
    print("3. Update package: pip install --upgrade google-generativeai")
    print("4. Check your internet connection")
    print("="*60 + "\n")