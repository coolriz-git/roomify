import { UploadIcon, CheckCircle2, ImageIcon, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef, type ChangeEvent, type DragEvent } from 'react'
import { useOutletContext } from 'react-router';
import { PROGRESS_INTERVAL_MS, PROGRESS_STEP, REDIRECT_DELAY_MS } from '../lib/constants';

interface UploadProps {
    onComplete: (base64: string) => void;
}

const Upload = ({ onComplete }: UploadProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { isSignedIn } = useOutletContext<AuthContext>();

    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, []);

    const MAX_FILE_SIZE_MB = 10;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    const processFile = (selectedFile: File) => {
        if (!isSignedIn) return;
        setError(null);

        // 1. Check File Size
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            setError(`File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
            return;
        }

        const reader = new FileReader();

        reader.onloadstart = () => {
            // Only set the file (switching UI to progress bar) once reading actually begins
            setFile(selectedFile);
            setProgress(0);
        };

        reader.onload = () => {
            const base64 = reader.result as string;

            progressIntervalRef.current = setInterval(() => {
                setProgress(prev => {
                    const next = prev + PROGRESS_STEP;
                    if (next >= 100) {
                        clearInterval(progressIntervalRef.current!);
                        progressIntervalRef.current = null;
                        setTimeout(() => onComplete(base64), REDIRECT_DELAY_MS);
                        return 100;
                    }
                    return next;
                });
            }, PROGRESS_INTERVAL_MS);
        };

        reader.onerror = () => {
            setFile(null);
            setProgress(0);
            setError("Could not read this file. It might be corrupted.");
        };

        reader.readAsDataURL(selectedFile);
    };

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) processFile(selected);
    };

    const onDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (isSignedIn) setIsDragging(true);
    };

    const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (!isSignedIn) return;
        const dropped = e.dataTransfer.files[0];
        if (dropped) processFile(dropped);
    };

    return (
        <div className='upload'>
            {!file ? (
                <div
                    className={`dropzone ${isDragging ? 'is-dragging' : ''} ${error ? 'is-error' : ''}`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                >
                    <input
                        type='file'
                        className='drop-input'
                        accept='.jpg,.jpeg,.png'
                        disabled={!isSignedIn}
                        onChange={onChange}
                    />
                    <div className='drop-content'>
                        <div className={`drop-icon ${error ? 'text-red-500' : ''}`}>
                            {error ? <AlertCircle size={20} /> : <UploadIcon size={20} />}
                        </div>
                        <p className={error ? 'text-red-500 font-medium' : ''}>
                            {error || (isSignedIn ? (
                                "Click to upload or just drag and drop"
                            ) : (
                                "Sign in or sign up to upload your floor plan"
                            ))}
                        </p>
                        <p className='help'>
                            {error
                                ? "Please try again with a different file."
                                : `Maximum file size is ${MAX_FILE_SIZE_MB}MB.`
                            }
                        </p>
                    </div>
                </div>
            ) : (
                <div className="upload-status">
                    <div className="status-content">
                        <div className="status-icon">
                            {progress === 100 ? (
                                <CheckCircle2 className="check" />
                            ) : (
                                <ImageIcon className="image" />
                            )}
                        </div>

                        <h3>{file.name}</h3>

                        <div className='progress'>
                            <div className="bar" style={{ width: `${progress}%` }}></div>
                            <p className='status-text'>
                                {progress < 100 ? 'Analyzing Floor Plan...' : 'Redirecting...'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Upload
