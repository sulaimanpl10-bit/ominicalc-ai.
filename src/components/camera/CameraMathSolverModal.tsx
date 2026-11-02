import React, { useState, useRef, useEffect, useId } from 'react';
import {
  Camera,
  Upload,
  X,
  RotateCw,
  Crop,
  Check,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Loader2,
  Copy,
  ExternalLink,
  ChevronRight,
  Image as ImageIcon,
  ShieldCheck,
  Eye,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { CalculatorMode, CameraMathExtraction, AISolveResponse } from '../../types/calculator';
import { CALCULATOR_MODES } from '../../utils/modesConfig';
import { processMathImage, ProcessedImage } from '../../utils/imageProcessor';
import { generateSampleMathImages, SampleMathImage } from '../../utils/sampleMathImages';
import { MathRenderer } from '../common/MathRenderer';

interface CameraMathSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyMathToSolver?: (mathText: string) => void;
}

type StepState = 'source' | 'preview-edit' | 'confirm-math' | 'solution';

export const CameraMathSolverModal: React.FC<CameraMathSolverModalProps> = ({
  isOpen,
  onClose,
  onApplyMathToSolver,
}) => {
  const { setMode, addHistory, showToast, performanceMode } = useCalculator();

  const [step, setStep] = useState<StepState>('source');
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Raw and processed image
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [cropPreset, setCropPreset] = useState<'full' | 'center-wide' | 'center-tall'>('full');

  // Loading & extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [extractionResult, setExtractionResult] = useState<CameraMathExtraction | null>(null);
  const [editableMath, setEditableMath] = useState('');
  const [selectedMode, setSelectedMode] = useState<CalculatorMode>('equations');
  const [solveResult, setSolveResult] = useState<AISolveResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Samples
  const [sampleImages, setSampleImages] = useState<SampleMathImage[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSampleImages(generateSampleMathImages());
    } else {
      stopCameraStream();
      resetState();
    }
  }, [isOpen]);

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const resetState = () => {
    setStep('source');
    setRawImageSrc(null);
    setProcessedImage(null);
    setRotationDeg(0);
    setCropPreset('full');
    setExtractionResult(null);
    setEditableMath('');
    setSolveResult(null);
    setErrorMsg(null);
    setCameraError(null);
  };

  // Start device camera
  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setFacingMode(facing);
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('Camera access error:', error);
      let friendlyMessage = 'Unable to access camera.';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        friendlyMessage =
          'Camera permission was denied. Please allow camera permissions in your browser or select an image from your gallery below.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        friendlyMessage =
          'No camera hardware detected on this device. You can select an image from your gallery instead.';
      } else {
        friendlyMessage = `${error.message || 'Camera failed to initialize.'} You can use gallery selection instead.`;
      }
      setCameraError(friendlyMessage);
      setCameraActive(false);
    }
  };

  const handleCapturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    stopCameraStream();
    setRawImageSrc(dataUrl);
    await applyImageProcessing(dataUrl, 0, 'full');
    setStep('preview-edit');
  };

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG, PNG, HEIC, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setRawImageSrc(dataUrl);
      await applyImageProcessing(dataUrl, 0, 'full');
      setStep('preview-edit');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSampleSelect = async (sample: SampleMathImage) => {
    setRawImageSrc(sample.dataUrl);
    await applyImageProcessing(sample.dataUrl, 0, 'full');
    setStep('preview-edit');
  };

  // Processing pipeline
  const applyImageProcessing = async (
    imgSrc: string,
    deg: number,
    preset: 'full' | 'center-wide' | 'center-tall'
  ) => {
    try {
      let cropRect: { x: number; y: number; width: number; height: number } | undefined = undefined;
      if (preset === 'center-wide') {
        cropRect = { x: 0.05, y: 0.25, width: 0.9, height: 0.5 };
      } else if (preset === 'center-tall') {
        cropRect = { x: 0.2, y: 0.1, width: 0.6, height: 0.8 };
      }

      const processed = await processMathImage(imgSrc, {
        rotationDeg: deg,
        cropRect,
        maxDimension: 1280,
        quality: 0.88,
      });

      setProcessedImage(processed);
      setRotationDeg(deg);
      setCropPreset(preset);
    } catch (err: unknown) {
      console.error('Image processing failed:', err);
      setErrorMsg('Failed to process image. Please try again or select another image.');
    }
  };

  const handleRotate = async () => {
    if (!rawImageSrc) return;
    const newDeg = (rotationDeg + 90) % 360;
    await applyImageProcessing(rawImageSrc, newDeg, cropPreset);
  };

  const handleCropPresetChange = async (preset: 'full' | 'center-wide' | 'center-tall') => {
    if (!rawImageSrc) return;
    await applyImageProcessing(rawImageSrc, rotationDeg, preset);
  };

  // Step 2 -> Step 3: Extract Math via Gemini Vision
  const handleExtractMath = async () => {
    if (!processedImage) return;

    setIsExtracting(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/gemini/camera-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: processedImage.base64,
          mimeType: processedImage.mimeType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze mathematical image.');
      }

      const result: CameraMathExtraction = data.result;
      setExtractionResult(result);
      setEditableMath(result.extractedMath || '');

      if (result.suggestedMode) {
        setSelectedMode(result.suggestedMode);
      }

      setStep('confirm-math');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Mathematical recognition failed. Please ensure good lighting and text clarity.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Step 3 -> Step 4: Solve Problem with Gemini
  const handleSolveConfirmed = async () => {
    const mathToSolve = editableMath.trim();
    if (!mathToSolve) {
      setErrorMsg('Mathematical problem cannot be empty. Please verify expression.');
      return;
    }

    setIsSolving(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/gemini/camera-solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: processedImage?.base64,
          mimeType: processedImage?.mimeType,
          confirmedProblem: mathToSolve,
          performanceMode,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to solve mathematical problem.');
      }

      const res: AISolveResponse = data.result;
      setSolveResult(res);

      // Save to history
      addHistory({
        mode: selectedMode || 'ai-solver',
        modeName: 'AI Camera Solver',
        expression: mathToSolve,
        result: res.finalAnswer,
        details: res.problemSummary || 'Solved from camera image',
      });

      setStep('solution');
      showToast('Solved with mathematical step-by-step breakdown');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Solving error. Please check equation syntax.');
    } finally {
      setIsSolving(false);
    }
  };

  const handleCopySolution = () => {
    if (!solveResult) return;
    const text = `Problem: ${solveResult.problemSummary || editableMath}\n\nAnswer: ${
      solveResult.finalAnswer
    }\n\nSteps:\n${solveResult.steps.join('\n')}\n\nExplanation: ${solveResult.explanation || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied full derivation');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJumpToCalculator = () => {
    if (selectedMode) {
      setMode(selectedMode);
      onClose();
    }
  };

  const handleApplyToMainSolver = () => {
    if (onApplyMathToSolver && editableMath) {
      onApplyMathToSolver(editableMath);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 id="camera-modal-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>AI Camera Math Solver</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                  Gemini Vision
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Printed & handwritten math recognition with step-by-step solutions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close camera solver"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* STEP 1: Image Source Selection (Camera / Gallery / Samples) */}
        {step === 'source' && (
          <div className="p-5 space-y-5">
            {cameraActive ? (
              <div className="space-y-3">
                <div className="relative bg-black rounded-xl overflow-hidden aspect-4/3 sm:aspect-16/9 flex items-center justify-center border border-slate-700">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Guide focus frame */}
                  <div className="absolute inset-8 sm:inset-12 border-2 border-indigo-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                    <span className="text-[11px] text-white/90 bg-black/60 px-2 py-0.5 rounded self-start backdrop-blur-xs font-mono">
                      Align mathematical expression inside box
                    </span>
                    <span className="text-[10px] text-white/70 bg-black/60 px-2 py-0.5 rounded self-end backdrop-blur-xs">
                      Tap Shutter to capture
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    onClick={() =>
                      startCamera(facingMode === 'environment' ? 'user' : 'environment')
                    }
                    className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Flip Camera</span>
                  </button>

                  <button
                    onClick={handleCapturePhoto}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <div className="w-3 h-3 rounded-full bg-white animate-ping" />
                    <span>Capture Photo</span>
                  </button>

                  <button
                    onClick={stopCameraStream}
                    className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Camera error message if permission was denied */}
                {cameraError && (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold mb-0.5">Camera Permission Note</div>
                      <div>{cameraError}</div>
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    onClick={() => startCamera()}
                    className="p-5 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 dark:hover:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-2xl transition-all group text-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 group-hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow-xs">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        Take Photo with Camera
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Scan from textbook, worksheet, or whiteboard
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 rounded-2xl transition-all group text-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        Upload from Gallery or Files
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Select screenshot or homework picture
                      </div>
                    </div>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleGallerySelect}
                    className="hidden"
                  />
                </div>

                {/* Pre-built Test Samples for Fast Verification */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Try with a verified sample problem:</span>
                    <span className="text-[10px] text-indigo-500 font-normal">Click to test instant OCR</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sampleImages.map((sample) => (
                      <button
                        key={sample.id}
                        onClick={() => handleSampleSelect(sample)}
                        className="p-2.5 flex items-start gap-2.5 text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-800 rounded-xl transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                          <img
                            src={sample.dataUrl}
                            alt={sample.title}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {sample.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {sample.description}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 shrink-0 self-center" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy & Security Note */}
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/80">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    <strong>Privacy First:</strong> Uploaded images are compressed locally and analyzed in-memory. They are never saved permanently or used for advertising.
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 2: Preview, Rotate, Crop & Confirm Image */}
        {step === 'preview-edit' && processedImage && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Preview & Enhance Mathematical Focus</span>
              <span className="font-mono text-[11px] text-slate-400">
                {processedImage.width}×{processedImage.height}px • {processedImage.sizeKb} KB
              </span>
            </div>

            {/* Image Preview Box */}
            <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-16/10 flex items-center justify-center border border-slate-700 max-h-72">
              <img
                src={processedImage.dataUrl}
                alt="Captured mathematical problem"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Edit Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRotate}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Rotate</span>
                </button>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

                <span className="text-[11px] text-slate-400 px-1">Crop:</span>
                <button
                  onClick={() => handleCropPresetChange('full')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    cropPreset === 'full'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Full
                </button>
                <button
                  onClick={() => handleCropPresetChange('center-wide')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    cropPreset === 'center-wide'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Equation Strip
                </button>
                <button
                  onClick={() => handleCropPresetChange('center-tall')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    cropPreset === 'center-tall'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Center Box
                </button>
              </div>

              <button
                onClick={() => setStep('source')}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors"
              >
                Retake / Change
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setStep('source')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Back
              </button>

              <button
                onClick={handleExtractMath}
                disabled={isExtracting}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-all"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recognizing Math...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract & Confirm Expression</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Math Confirmation & Correction before solving */}
        {step === 'confirm-math' && extractionResult && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Step 1 of 2: Verify Detected Expression
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {extractionResult.problemType || 'Math Recognition'}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Confidence: {extractionResult.confidence}
                </span>
              </div>
            </div>

            {/* LaTeX Mathematical Rendering Display */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-center">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Mathematical Notation (KaTeX Render)
              </div>
              <div className="text-xl sm:text-2xl text-slate-900 dark:text-white font-semibold py-1">
                <MathRenderer latex={extractionResult.latex || editableMath} />
              </div>
            </div>

            {/* Uncertainty Warning / Confirmation Callout */}
            {extractionResult.uncertainties && extractionResult.uncertainties.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Please confirm ambiguous characters:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-amber-800 dark:text-amber-300/90 pl-1 space-y-0.5">
                  {extractionResult.uncertainties.map((unc, idx) => (
                    <li key={idx}>{unc}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Editable Input for User Correction */}
            <div>
              <label htmlFor="camera-edit-math-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm or Edit Expression:
              </label>
              <textarea
                id="camera-edit-math-input"
                value={editableMath}
                onChange={(e) => setEditableMath(e.target.value)}
                rows={2}
                placeholder="Edit mathematical expression if needed..."
                className="w-full p-3 font-mono text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
              <div className="text-[11px] text-slate-400 mt-1">
                You can freely edit numbers, symbols, or operators if your handwriting was smudged.
              </div>
            </div>

            {/* Suggested Calculator Mode Switcher */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <span>Recommended Solver: </span>
                <span className="font-bold text-slate-900 dark:text-white capitalize">
                  {CALCULATOR_MODES.find((m) => m.id === selectedMode)?.name || selectedMode}
                </span>
              </div>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as CalculatorMode)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {CALCULATOR_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setStep('preview-edit')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Back to Image
              </button>

              <div className="flex items-center gap-2">
                {onApplyMathToSolver && (
                  <button
                    onClick={handleApplyToMainSolver}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Paste into AI Solver
                  </button>
                )}

                <button
                  onClick={handleSolveConfirmed}
                  disabled={isSolving || !editableMath.trim()}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-all"
                >
                  {isSolving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Solving Derivation...</span>
                    </>
                  ) : (
                    <>
                      <span>Solve Step-by-Step</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Solution Display with KaTeX */}
        {step === 'solution' && solveResult && (
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Header with Problem & Copy */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Solved Mathematical Question
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {solveResult.problemSummary || editableMath}
                </h3>
              </div>

              <button
                onClick={handleCopySolution}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Solution'}</span>
              </button>
            </div>

            {/* Final Answer Banner with KaTeX */}
            <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                Final Answer
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-950 dark:text-indigo-100 break-all">
                {solveResult.finalAnswer}
              </div>
              {solveResult.latex && (
                <div className="mt-2 text-base text-indigo-900 dark:text-indigo-200 bg-white/70 dark:bg-slate-900/70 px-3 py-1.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 inline-block max-w-full overflow-x-auto">
                  <MathRenderer latex={solveResult.latex} />
                </div>
              )}
            </div>

            {/* Step-by-Step Breakdown */}
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Step-by-Step Mathematical Derivation
              </div>
              <div className="space-y-2">
                {solveResult.steps.map((stepText, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 leading-relaxed font-mono text-xs sm:text-sm">
                      <MathRenderer latex={stepText} displayMode={false} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* High-Level Intuitive Explanation */}
            {solveResult.explanation && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Conceptual Insight: </span>
                {solveResult.explanation}
              </div>
            )}

            {/* Dedicated Tool Jump Banner */}
            <div className="flex items-center justify-between p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
              <span>
                Want to graph or explore more variations?
              </span>
              <button
                onClick={handleJumpToCalculator}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors shrink-0 ml-2"
              >
                Open in {CALCULATOR_MODES.find((m) => m.id === selectedMode)?.shortName || 'Calculator'}
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setStep('source')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan Another Problem</span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
