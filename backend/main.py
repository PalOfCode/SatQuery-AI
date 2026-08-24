import os
import asyncio

from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from google import genai
from google.genai import types


# =========================================================
# Load environment variables
# =========================================================

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing. Check backend/.env"
    )


# =========================================================
# FastAPI App
# =========================================================

app = FastAPI(
    title="SatQuery AI API",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# Gemini Client
# =========================================================

client = genai.Client(
    api_key=API_KEY,
    http_options=types.HttpOptions(
        timeout=120000
    )
)


# =========================================================
# Home
# =========================================================

@app.get("/")
def home():
    return {
        "message": "SatQuery AI Backend is running!"
    }


# =========================================================
# Analyze Satellite Image
# =========================================================

@app.post("/api/analyze")
async def analyze(
    image: UploadFile = File(...),
    query: str = Form(...)
):

    try:

        # -------------------------------------------------
        # Validate image type
        # -------------------------------------------------

        if not image.content_type:

            return {
                "success": False,
                "error": "Image type could not be detected."
            }

        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/tiff",
        ]

        if image.content_type not in allowed_types:

            return {
                "success": False,
                "error": (
                    "Unsupported image format. "
                    "Use JPG, PNG, WEBP or TIFF."
                )
            }


        # -------------------------------------------------
        # Validate question
        # -------------------------------------------------

        if not query or not query.strip():

            return {
                "success": False,
                "error": "Please enter a question."
            }


        # -------------------------------------------------
        # Read image
        # -------------------------------------------------

        image_bytes = await image.read()

        if not image_bytes:

            return {
                "success": False,
                "error": "Uploaded image is empty."
            }


        # -------------------------------------------------
        # Create Gemini image part
        # -------------------------------------------------

        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=image.content_type
        )


        # -------------------------------------------------
        # AI Prompt
        # -------------------------------------------------

        prompt = f"""
You are SatQuery AI, an intelligent assistant specialized
in satellite imagery and remote sensing.

Analyze the provided image carefully.

Answer the user's question using ONLY information that
can reasonably be observed from the image.

SCIENTIFIC RULES:

1. Describe only visible features.

2. Do not invent:
   - satellite names
   - sensor names
   - wavelengths
   - acquisition dates
   - coordinates
   - exact locations
   - image sources
   - percentages
   - measurements

3. Do not identify a specific satellite unless the user
   provides that information.

4. Clearly distinguish observation from inference.

5. If something cannot be determined reliably, say:
   "This cannot be determined reliably from the image."

6. If clouds cover the surface, mention that this limits
   the analysis.

7. Do not overstate confidence.

8. Use simple scientific remote-sensing terminology.

Look for visible features such as:

- Cloud cover
- Water bodies
- Vegetation
- Forest
- Agricultural land
- Urban areas
- Roads
- Buildings
- Bare soil
- Coastlines
- Rivers
- Mountains
- Other visible land-cover features

For important observations, briefly explain the visual
evidence.

USER QUESTION:
{query}

Give a clear, concise and useful answer.
"""


        # -------------------------------------------------
        # Gemini request with retry
        # -------------------------------------------------

        response = None

        max_attempts = 3

        for attempt in range(max_attempts):

            try:

                print(
                    f"Gemini request "
                    f"{attempt + 1}/{max_attempts}"
                )

                response = client.models.generate_content(

                    model="gemini-3.5-flash-lite",

                    contents=[
                        image_part,
                        prompt
                    ],

                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        max_output_tokens=700
                    )
                )

                # Request successful
                break


            except Exception as gemini_error:

                error_text = str(gemini_error)

                print(
                    f"Gemini error on attempt "
                    f"{attempt + 1}:"
                )

                print(error_text)


                # -----------------------------------------
                # Temporary error
                # -----------------------------------------

                temporary_error = (
                    "503" in error_text
                    or "UNAVAILABLE" in error_text
                    or "504" in error_text
                    or "DEADLINE" in error_text.upper()
                    or "Deadline expired" in error_text
                    or "429" in error_text
                )


                if temporary_error:

                    # Last attempt
                    if attempt == max_attempts - 1:

                        return {
                            "success": False,
                            "error": (
                                "Gemini AI service is "
                                "temporarily unavailable. "
                                "Please try again in a few seconds."
                            )
                        }


                    # Wait before retry
                    wait_time = 3 * (2 ** attempt)

                    print(
                        f"Retrying in "
                        f"{wait_time} seconds..."
                    )

                    await asyncio.sleep(wait_time)


                else:

                    # Non-temporary error
                    return {
                        "success": False,
                        "error": error_text
                    }


        # -------------------------------------------------
        # Check response
        # -------------------------------------------------

        if response is None:

            return {
                "success": False,
                "error": "Gemini returned no response."
            }


        # -------------------------------------------------
        # Get answer
        # -------------------------------------------------

        answer = response.text


        if not answer:

            return {
                "success": False,
                "error": "Gemini returned an empty response."
            }


        # -------------------------------------------------
        # Successful response
        # -------------------------------------------------

        return {
            "success": True,
            "filename": image.filename,
            "query": query,
            "answer": answer
        }


    # =====================================================
    # Unexpected error
    # =====================================================

    except Exception as error:

        print()
        print("================================")
        print("SATQUERY AI BACKEND ERROR")
        print("================================")
        print(error)
        print("================================")
        print()

        return {
            "success": False,
            "error": str(error)
        }