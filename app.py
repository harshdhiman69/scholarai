from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os
from dotenv import load_dotenv
import time
import json
import re
import graphviz
import base64
from io import BytesIO

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

model = None
MODEL_NAME = None

print("\n🔍 Initializing Gemini model with free tier optimization...")

try:
    flash_models = [
        'models/gemini-2.0-flash',
        'models/gemini-flash-latest',
        'models/gemini-2.5-flash',
        'models/gemini-2.0-flash-exp'
    ]
    
    model_initialized = False
    
    for model_name in flash_models:
        try:
            print(f"  Trying {model_name}...")
            test_model = genai.GenerativeModel(model_name)
            # Quick test
            test_response = test_model.generate_content("Hi")
            if test_response and test_response.text:
                model = test_model
                MODEL_NAME = model_name
                model_initialized = True
                print(f"  ✅ Successfully using: {MODEL_NAME}")
                break
        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower():
                print(f"  ⚠️  {model_name} - quota exceeded, trying next...")
                continue
            else:
                print(f"  ⚠️  {model_name} - {str(e)[:50]}...")
                continue
    
    if not model_initialized:
        raise Exception("All Flash models exceeded quota. Please wait or try a new API key.")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    raise

SYSTEM_PROMPT = """You are ScholarAI, an advanced educational AI assistant. 
Provide comprehensive, detailed summaries and analyses that maintain educational value.

Guidelines:
1. Provide thorough explanations with context
2. Maintain important details and supporting information
3. Explain concepts clearly for learning purposes
4. Preserve the educational value of the content
5. Use proper formatting with sections, bullet points, and emphasis

Always be educational, thorough, and clear."""


#routes

@app.route('/')
def index():
    """Homepage"""
    return render_template('index.html')


@app.route('/summarize')
def summarize_page():
    """Summarizer page"""
    return render_template('summarize.html')


@app.route('/quiz')
def quiz_page():
    """Quiz Generator page"""
    return render_template('quiz.html')

@app.route('/flowchart')
def flowchart_page():
    """Flowchart Generator Page"""
    return render_template('flowchart.html')


# API ENDPOINTS - summarizer

@app.route('/summarize', methods=['POST'])
def summarize():
    """Handle summarization requests with Gemini API"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'answer': 'Error: No text provided for analysis.'
            }), 400
        
        text = data['text'].strip()
        
        # Validate text length
        if len(text) < 100:
            return jsonify({
                'answer': 'Text is too short. Please provide at least 100 characters for meaningful analysis.'
            }), 400
        
        if len(text) > 30000:
            return jsonify({
                'answer': 'Text is too long. Please provide text under 30,000 characters to stay within quota limits.'
            }), 400
        
        # Determine analysis depth based on text length
        text_length = len(text)
        if text_length < 500:
            analysis_instruction = "Provide a concise but complete summary with key points."
        elif text_length < 2000:
            analysis_instruction = "Provide a detailed analysis with main concepts, key points, and supporting details."
        else:
            analysis_instruction = "Provide a comprehensive analysis including: Main Concepts, Key Details, and Takeaways."
        
        # Create the prompt
        prompt = f"""{analysis_instruction}

Text to analyze:
{text}

Provide your educational analysis:"""
        
        print(f"📝 Summarizing {text_length} chars with {MODEL_NAME}")
        
        # Generate response with retry logic
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                response = model.generate_content(
                    prompt,
                    generation_config={
                        'temperature': 0.7,
                        'top_p': 0.95,
                        'max_output_tokens': 1024,
                    }
                )
                
                if response and response.text:
                    print(f"✅ Summary generated")
                    return jsonify({
                        'answer': response.text,
                        'model': MODEL_NAME.replace('models/', ''),
                        'text_length': text_length
                    }), 200
                    
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower():
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (attempt + 1)
                        print(f"⚠️  Rate limit hit, waiting {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    else:
                        return jsonify({
                            'answer': '⚠️ Rate limit reached. Please wait a moment and try again.'
                        }), 429
                else:
                    raise e
        
        return jsonify({
            'answer': 'Error: Unable to generate response after retries.'
        }), 500
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Summarize error: {error_msg}")
        
        if "429" in error_msg or "quota" in error_msg.lower():
            return jsonify({
                'answer': '⚠️ Daily quota exceeded. Please try again tomorrow or upgrade your API plan.'
            }), 429
        
        return jsonify({
            'answer': f'Error: {error_msg[:200]}... Please try again.'
        }), 500

# API ENDPOINTS - quiz generator

@app.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    """Generate quiz questions from text using Gemini"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'error': 'No text provided for quiz generation.'
            }), 400
        
        text = data['text'].strip()
        num_questions = data.get('num_questions', 5)
        difficulty = data.get('difficulty', 'medium')
        
        # Validate inputs
        if len(text) < 100:
            return jsonify({
                'error': 'Text is too short. Please provide at least 100 characters.'
            }), 400
        
        if len(text) > 20000:
            return jsonify({
                'error': 'Text is too long. Please keep it under 20,000 characters.'
            }), 400
        
        if num_questions < 3 or num_questions > 15:
            return jsonify({
                'error': 'Number of questions must be between 3 and 15.'
            }), 400
        
        # Quiz generation prompt
        prompt = f"""Generate {num_questions} multiple choice questions ({difficulty} difficulty) from this text.

IMPORTANT: Format EXACTLY as JSON. Do not include any markdown formatting or code blocks.

{{
  "questions": [
    {{
      "question": "Clear question text here?",
      "options": {{
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      }},
      "correct": "A",
      "explanation": "Brief explanation why this is correct"
    }}
  ]
}}

Text to create quiz from:
{text}

Generate {num_questions} questions now in pure JSON format:"""
        
        print(f"📝 Generating {num_questions} {difficulty} questions...")
        
        # Generate with retry logic
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                response = model.generate_content(
                    prompt,
                    generation_config={
                        'temperature': 0.8,
                        'top_p': 0.95,
                        'max_output_tokens': 2048,
                    }
                )
                
                if not response or not response.text:
                    if attempt < max_retries - 1:
                        continue
                    return jsonify({'error': 'Failed to generate quiz'}), 500
                
                # Parse JSON response
                response_text = response.text.strip()
                
                # Clean response - remove markdown code blocks if present
                json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
                if json_match:
                    response_text = json_match.group(1)
                elif response_text.startswith('```') and response_text.endswith('```'):
                    response_text = response_text.strip('`').strip()
                    if response_text.startswith('json'):
                        response_text = response_text[4:].strip()
                
                # Try to parse JSON
                try:
                    quiz_data = json.loads(response_text)
                    
                    # Validate quiz structure
                    if 'questions' not in quiz_data or not isinstance(quiz_data['questions'], list):
                        raise ValueError("Invalid quiz structure")
                    
                    if len(quiz_data['questions']) == 0:
                        raise ValueError("No questions generated")
                    
                    # Validate each question
                    for q in quiz_data['questions']:
                        if not all(key in q for key in ['question', 'options', 'correct']):
                            raise ValueError("Invalid question structure")
                    
                    print(f"✅ Generated {len(quiz_data['questions'])} questions successfully")
                    
                    return jsonify({
                        'success': True,
                        'quiz': quiz_data,
                        'num_questions': len(quiz_data['questions'])
                    }), 200
                    
                except (json.JSONDecodeError, ValueError) as je:
                    print(f"⚠️  JSON parse attempt {attempt + 1} failed: {str(je)[:50]}")
                    
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        continue
                    
                    print(f"⚠️  Returning raw text after {max_retries} attempts")
                    return jsonify({
                        'success': True,
                        'quiz_text': response.text,
                        'note': 'Quiz generated but not in perfect JSON format. Please try again.'
                    }), 200
                    
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower():
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (attempt + 1)
                        print(f"⚠️  Rate limit, waiting {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    return jsonify({
                        'error': 'Quota exceeded. Please try again later.'
                    }), 429
                else:
                    raise e
        
        return jsonify({'error': 'Failed to generate quiz after retries'}), 500
        
    except Exception as e:
        error_str = str(e)
        print(f"❌ Quiz generation error: {error_str[:100]}")
        
        if "429" in error_str or "quota" in error_str.lower():
            return jsonify({
                'error': 'Quota exceeded. Please try again later.'
            }), 429
        
        return jsonify({
            'error': f'Error: {error_str[:100]}... Please try again.'
        }), 500

#FLOWCHART PART

@app.route('/generate-flowchart', methods=['POST'])
def generate_flowchart():
    """Generate flowchart from text using Gemini and Graphviz"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'error': 'No text provided for flowchart generation.'
            }), 400
        
        text = data['text'].strip()
        chart_style = data.get('chart_style', 'TB')
        
        # Validate inputs
        if len(text) < 50:
            return jsonify({
                'error': 'Text is too short. Please provide at least 50 characters describing the process.'
            }), 400
        
        if len(text) > 15000:
            return jsonify({
                'error': 'Text is too long. Please keep it under 15,000 characters.'
            }), 400
        
        prompt = f"""Create a Graphviz DOT flowchart from this text. Follow these EXACT rules:

MANDATORY FORMAT:
digraph G {{
    rankdir={chart_style};
    node [fontname="Arial", fontsize=12];
    edge [fontname="Arial", fontsize=10];
    
    // Nodes
    start [label="Start", shape=ellipse, style=filled, fillcolor="#87CEEB"];
    node1 [label="Step description", shape=box, style=filled, fillcolor="#90EE90"];
    decision1 [label="Question?", shape=diamond, style=filled, fillcolor="#FFD700"];
    end [label="End", shape=ellipse, style=filled, fillcolor="#FFA07A"];
    
    // Edges
    start -> node1;
    node1 -> decision1;
    decision1 -> end [label="Yes"];
}}

CRITICAL RULES:
1. Use ONLY alphanumeric node IDs (start, step1, step2, end)
2. NO special characters in node IDs
3. Keep labels under 40 characters
4. Use double quotes for ALL labels
5. End every statement with semicolon
6. Use -> for directed edges
7. Maximum 15 nodes
8. Return ONLY the DOT code, NO explanations

Text describing the process:
{text}

Generate the Graphviz DOT code:"""
        
        print(f"📊 Generating flowchart...")
        
        # Generate with multiple retries
        max_retries = 5
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                print(f"Attempt {attempt + 1}/{max_retries}")
                
                response = model.generate_content(
                    prompt,
                    generation_config={
                        'temperature': 0.4,  
                        'top_p': 0.8,
                        'top_k': 40,
                        'max_output_tokens': 2000,
                    }
                )
                
                if not response or not response.text:
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        continue
                    return jsonify({'error': 'Failed to generate flowchart'}), 500
                
                # Clean response
                dot_code = response.text.strip()
                print(f"Raw response length: {len(dot_code)}")
                
                if '```' in dot_code:
                    patterns = ['```dot', '```graphviz', '```']
                    for pattern in patterns:
                        if pattern in dot_code:
                            parts = dot_code.split(pattern)
                            if len(parts) >= 2:
                                dot_code = parts[1].split('```')[0]
                                break
                
                dot_code = dot_code.strip()
                
                # Remove any explanatory text before/after the diagram
                if 'digraph' in dot_code:
                    start_idx = dot_code.find('digraph')
                    if start_idx > 0:
                        dot_code = dot_code[start_idx:]
                    
                    last_brace = dot_code.rfind('}')
                    if last_brace > 0:
                        dot_code = dot_code[:last_brace + 1]
                
                print(f"Cleaned code preview: {dot_code[:100]}...")
                
                if not dot_code.startswith('digraph'):
                    print(f"⚠️  Invalid start, doesn't begin with 'digraph'")
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        continue
                    return jsonify({
                        'error': 'Generated code format is invalid. Please try with a simpler description.'
                    }), 400
                
                if not dot_code.strip().endswith('}'):
                    print(f"⚠️  Invalid end, doesn't end with '}}'")
                    dot_code = dot_code + '\n}'
                
                # Additional cleaning - fix common issues
                dot_code = dot_code.replace('–', '-')  # Replace en-dash with hyphen
                dot_code = dot_code.replace('—', '-')  # Replace em-dash with hyphen
                dot_code = dot_code.replace('"', '"').replace('"', '"')  # Fix smart quotes
                dot_code = dot_code.replace(''', "'").replace(''', "'")  # Fix smart apostrophes
                
                try:
                    print("Attempting to render with Graphviz...")
                    graph = graphviz.Source(dot_code)
                    
                    # Render to SVG
                    svg_data = graph.pipe(format='svg').decode('utf-8')
                    print(f"✅ SVG rendered successfully ({len(svg_data)} bytes)")
                    
                    # Render to PNG and convert to base64
                    png_data = graph.pipe(format='png')
                    png_base64 = base64.b64encode(png_data).decode('utf-8')
                    print(f"✅ PNG rendered successfully")
                    
                    return jsonify({
                        'success': True,
                        'dot_code': dot_code,
                        'svg_data': svg_data,
                        'png_base64': png_base64,
                        'chart_style': chart_style
                    }), 200
                    
                except Exception as render_error:
                    error_msg = str(render_error)
                    print(f"⚠️  Render error: {error_msg}")
                    
                    # If it's a syntax error and we have retries left, try again
                    if attempt < max_retries - 1:
                        print(f"Retrying with modified prompt...")
                        time.sleep(retry_delay)
                        
                        # Add the error feedback to the next prompt
                        prompt = f"""The previous attempt had this error: {error_msg[:100]}

Please create a SIMPLE, VALID Graphviz DOT flowchart. Use this EXACT format:

digraph G {{
    rankdir={chart_style};
    start [label="Start", shape=ellipse, style=filled, fillcolor="#87CEEB"];
    step1 [label="First step", shape=box, style=filled, fillcolor="#90EE90"];
    end [label="End", shape=ellipse, style=filled, fillcolor="#FFA07A"];
    start -> step1;
    step1 -> end;
}}

Create a flowchart from: {text[:500]}

Return ONLY valid DOT code:"""
                        continue
                    
                    return jsonify({
                        'error': f'Could not render the flowchart. The generated code has syntax issues. Please try with a simpler description or different wording.'
                    }), 400
                
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower():
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (attempt + 1)
                        print(f"⚠️  Rate limit, waiting {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    return jsonify({
                        'error': 'API quota exceeded. Please try again later.'
                    }), 429
                else:
                    print(f"❌ Unexpected error: {error_str}")
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        continue
                    raise e
        
        return jsonify({
            'error': 'Failed to generate valid flowchart after multiple attempts. Please try simplifying your description or breaking it into smaller steps.'
        }), 500
        
    except Exception as e:
        error_str = str(e)
        print(f"❌ Flowchart generation error: {error_str}")
        
        if "429" in error_str or "quota" in error_str.lower():
            return jsonify({
                'error': 'API quota exceeded. Please try again later.'
            }), 429
        
        return jsonify({
            'error': f'Unexpected error occurred. Please try again with a simpler description.'
        }), 500

# UTILITY ENDPOINTS

@app.route('/health')
def health():
    """Health check endpoint"""
    try:
        test_response = model.generate_content(
            "Test", 
            generation_config={'max_output_tokens': 10}
        )
        model_working = bool(test_response.text)
    except:
        model_working = False
        
    return jsonify({
        'status': 'healthy' if model_working else 'degraded',
        'model': MODEL_NAME,
        'api_configured': bool(GEMINI_API_KEY),
        'model_working': model_working
    }), 200


@app.route('/test-api')
def test_api():
    """Test API endpoint - uses minimal tokens"""
    try:
        response = model.generate_content(
            "Say 'OK'",
            generation_config={'max_output_tokens': 10}
        )
        return jsonify({
            'success': True,
            'response': response.text,
            'model': MODEL_NAME
        }), 200
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "quota" in error_str.lower():
            return jsonify({
                'success': False,
                'error': 'Quota exceeded - daily limit reached'
            }), 429
        return jsonify({
            'success': False,
            'error': str(e)[:100]
        }), 500

# ERROR HANDLERS

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Route not found'}), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

#main

if __name__ == '__main__':
    if not model:
        print("\n❌ Failed to initialize model.")
        exit(1)
        
    print("\n" + "="*70)
    print("🎓 ScholarAI")
    print("="*70)
    print(f"✓ Model: {MODEL_NAME}")
    print(f"✓ Server: http://localhost:5000")
    print(f"✓ Test API: http://localhost:5000/test-api")
    print(f"✓ Health Check: http://localhost:5000/health")
    print("   - Homepage: http://localhost:5000")
    print("   - Flash models: ~1500 requests/day")
    print("   - If quota exceeded: Wait 24 hours or create new API key")
    print("="*70 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)