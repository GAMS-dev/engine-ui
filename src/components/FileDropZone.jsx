import React, { useMemo } from "react";
import { useDropzone } from "react-dropzone";

const baseStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    borderWidth: 2,
    borderRadius: 2,
    borderColor: '#eeeeee',
    borderStyle: 'dashed',
    backgroundColor: '#fafafa',
    color: '#bdbdbd',
    outline: 'none',
    transition: 'border .24s ease-in-out'
};

const activeStyle = {
    borderColor: '#2196f3'
};

const acceptStyle = {
    borderColor: '#00e676'
};

const rejectStyle = {
    borderColor: '#ff1744'
};

const FileDropZone = ({ label, onDrop, multiple = true }) => {
    const { acceptedFiles,
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject } = useDropzone({ onDrop, multiple });

    const files = acceptedFiles.map(file => (
        <li key={file.path}>
            {file.path} - {file.size / 1e3} KB
        </li>
    ));

    const style = useMemo(() => ({
        ...baseStyle,
        ...(isDragActive ? activeStyle : {}),
        ...(isDragAccept ? acceptStyle : {}),
        ...(isDragReject ? rejectStyle : {})
    }), [
        isDragActive,
        isDragReject,
        isDragAccept
    ]);

    return (
        <>
            <div {...getRootProps({ style })}>
                <input {...getInputProps()} />
                <p>{label}</p>
            </div>
            <aside className="dropzone-file-info">
                <ul>{files}</ul>
            </aside>
        </>
    );
}

export default FileDropZone;
