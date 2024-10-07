// declarations.d.ts
declare module 'react-media-recorder' {
    interface ReactMediaRecorderProps {
        audio?: boolean;
        video?: boolean;
        blobPropertyBag?: BlobPropertyBag;
        onStop: (blobUrl: string, blob: Blob) => void;
        render: (props: {
            startRecording: () => void;
            stopRecording: () => void;
            mediaBlobUrl: string | null;
        }) => JSX.Element;
    }

    export const ReactMediaRecorder: React.FC<ReactMediaRecorderProps>;
}
