"""
Gemini AI Service for consultation note generation from audio recordings
"""
import logging
import os
import json
import google.generativeai as genai
from decouple import config

logger = logging.getLogger(__name__)


class GeminiConsultationService:
    """Service for generating consultation notes from audio recordings using Gemini Flash"""
    
    def __init__(self):
        """Initialize Gemini client with API key"""
        self.api_key = config('GEMINI_API_KEY', default=None)
        if self.api_key:
            genai.configure(api_key=self.api_key)
        else:
            logger.warning("GEMINI_API_KEY not configured in environment")
    
    def transcribe_and_generate_notes(self, audio_file_path: str, consultation_context: dict = None) -> dict:
        """
        Transcribe audio recording and generate structured consultation notes
        
        Args:
            audio_file_path: Path to the audio file
            consultation_context: Optional dictionary containing consultation information
                (patient name, vitals, chief complaint, etc.)
            
        Returns:
            dict with transcription and generated notes structure
        """
        try:
            if not self.api_key:
                return {
                    'success': False,
                    'error': 'Gemini API key not configured'
                }
            
            # Upload file to Gemini
            logger.info(f"Uploading audio file: {audio_file_path}")
            audio_file = genai.upload_file(audio_file_path)
            
            # Create model instance
            model = genai.GenerativeModel(model_name="gemini-2.5-flash")
            
            # First, transcribe the audio
            transcription_prompt = """Please transcribe this medical consultation audio recording. 
            Provide a complete, accurate transcription of the entire consultation.
            Format: Plain text transcription."""
            
            transcription_response = model.generate_content(
                [transcription_prompt, audio_file]
            )
            transcription_text = transcription_response.text
            
            # Build enhanced prompt with consultation context
            context_info = self._build_context_info(consultation_context)
            
            # Then, generate structured consultation notes in French
            notes_prompt = f"""Based on the medical consultation audio provided, generate comprehensive consultation notes in FRENCH (Français).

PATIENT CONTEXT:
{context_info}

Generate ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{{
    "chief_complaint": "motif principal de la consultation",
    "history_of_present_illness": "historique détaillé des symptômes et de la maladie",
    "physical_exam_findings": "résultats de l'examen physique par système",
    "assessment": "évaluation et impressions cliniques",
    "diagnosis": "diagnostics principaux et secondaires",
    "treatment_plan": "plan de traitement recommandé",
    "medications": "médicaments prescrits ou recommandés",
    "follow_up": "recommandations de suivi",
    "clinical_notes": "notes cliniques supplémentaires et observations"
}}

IMPORTANT: 
- All text MUST be in French (Français)
- Ensure all JSON is valid and properly formatted
- Close all brackets and braces
- Use the patient context provided above to enrich the notes"""
            
            notes_response = model.generate_content(
                [notes_prompt, audio_file]
            )
            notes_text = notes_response.text
            
            # Parse JSON from notes
            structured_notes = self._parse_json_response(notes_text)
            
            # Clean up uploaded file
            try:
                genai.delete_file(audio_file.name)
            except Exception as e:
                logger.warning(f"Could not delete uploaded file: {e}")
            
            return {
                'success': True,
                'transcription': transcription_text,
                'structured_notes': structured_notes,
                'chief_complaint': structured_notes.get('chief_complaint', ''),
                'history_of_present_illness': structured_notes.get('history_of_present_illness', ''),
                'assessment': structured_notes.get('assessment', ''),
                'treatment_plan': structured_notes.get('treatment_plan', ''),
                'medications': structured_notes.get('medications', ''),
                'follow_up': structured_notes.get('follow_up', ''),
            }
        
        except Exception as e:
            logger.error(f"Error transcribing audio with Gemini: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _build_context_info(self, consultation_context: dict = None) -> str:
        """
        Build formatted context information from consultation data
        
        Args:
            consultation_context: Dictionary containing patient and consultation details
            
        Returns:
            Formatted string with context information
        """
        if not consultation_context:
            return "No additional context provided."
        
        lines = []
        
        # Patient information
        if consultation_context.get('patientName'):
            lines.append(f"Patient: {consultation_context.get('patientName')}")
        if consultation_context.get('patientId'):
            lines.append(f"Patient ID: {consultation_context.get('patientId')}")
        
        # Chief complaint
        if consultation_context.get('chiefComplaint'):
            lines.append(f"Motif principal: {consultation_context.get('chiefComplaint')}")
        
        # History
        if consultation_context.get('historyOfPresentIllness'):
            lines.append(f"Antécédents: {consultation_context.get('historyOfPresentIllness')}")
        
        # Referred by
        if consultation_context.get('referredBy'):
            lines.append(f"Référé par: {consultation_context.get('referredBy')}")
        
        # Vitals
        vitals = consultation_context.get('vitals', {})
        if vitals:
            vitals_lines = []
            if vitals.get('temperature'):
                vitals_lines.append(f"Température: {vitals['temperature']}°C")
            if vitals.get('bloodPressureSystolic') and vitals.get('bloodPressureDiastolic'):
                vitals_lines.append(f"TA: {vitals['bloodPressureSystolic']}/{vitals['bloodPressureDiastolic']} mmHg")
            if vitals.get('heartRate'):
                vitals_lines.append(f"FC: {vitals['heartRate']} bpm")
            if vitals.get('oxygenSaturation'):
                vitals_lines.append(f"O2: {vitals['oxygenSaturation']}%")
            if vitals_lines:
                lines.append("Signes vitaux: " + ", ".join(vitals_lines))
        
        # Allergies and conditions
        allergies = consultation_context.get('allergies', [])
        if allergies:
            lines.append(f"Allergies: {', '.join(allergies)}")
        
        chronic_conditions = consultation_context.get('chronicConditions', [])
        if chronic_conditions:
            lines.append(f"Conditions chroniques: {', '.join(chronic_conditions)}")
        
        current_meds = consultation_context.get('currentMedications', [])
        if current_meds:
            lines.append(f"Médicaments actuels: {', '.join(current_meds)}")
        
        return "\n".join(lines) if lines else "No context provided."
    
    def _parse_json_response(self, text: str) -> dict:
        """
        Parse JSON from Gemini response, handling markdown code blocks
        
        Args:
            text: Response text from Gemini
            
        Returns:
            Parsed JSON dictionary
        """
        try:
            # Remove markdown code blocks if present
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            
            # Attempt to parse JSON
            return json.loads(text)
        except json.JSONDecodeError:
            logger.warning(f"Could not parse JSON from Gemini response: {text[:100]}")
            # Return structured empty response
            return {
                'chief_complaint': '',
                'history_of_present_illness': '',
                'physical_exam_findings': '',
                'assessment': '',
                'diagnosis': '',
                'treatment_plan': '',
                'medications': '',
                'follow_up': '',
                'notes': text
            }


def get_gemini_service() -> GeminiConsultationService:
    """Get configured Gemini consultation service instance"""
    return GeminiConsultationService()
