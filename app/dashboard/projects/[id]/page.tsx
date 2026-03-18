'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import CodeWorkspace from './CodeWorkspace';

const DocumentEditor = dynamic(() => import('./DocumentEditor'), { ssr: false });
const DesignEditor = dynamic(() => import('./DesignEditor'), { ssr: false });

interface Project {
  id: string;
  name: string;
  language: string;
  color?: string;
  type?: 'code' | 'design' | 'document';
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: '#080c14', color: 'rgba(255,255,255,0.4)' }}>
      <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export default function ProjectPage() {
  const params = useParams();
  const id = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [docContent, setDocContent] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('nexios_projects');
    if (saved) {
      try {
        const projects: Project[] = JSON.parse(saved);
        const p = projects.find(pr => pr.id === id);
        if (p) setProject(p);
      } catch { /* ignore */ }
    }

    // Load document content if applicable
    const savedDoc = localStorage.getItem(`nexios_doc_${id}`);
    if (savedDoc) setDocContent(savedDoc);

    setLoading(false);
  }, [id]);

  const handleDocChange = useCallback((html: string) => {
    setDocContent(html);
    localStorage.setItem(`nexios_doc_${id}`, html);
  }, [id]);

  if (loading) return <LoadingScreen label="Loading project…" />;

  if (!project) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: '#080c14', color: 'rgba(255,255,255,0.4)' }}>
      <p className="text-sm">Project not found.</p>
      <Link href="/dashboard/projects" className="text-indigo-400 hover:text-indigo-300 text-sm underline">← Back to projects</Link>
    </div>
  );

  const type = project.type || 'code';

  if (type === 'document') {
    return (
      <DocumentEditor
        content={docContent}
        onChange={handleDocChange}
        projectName={project.name}
        projectId={id}
      />
    );
  }

  if (type === 'design') {
    return (
      <DesignEditor
        projectId={id}
        projectName={project.name}
      />
    );
  }

  // Default: code environment
  return <CodeWorkspace project={project} />;
}
