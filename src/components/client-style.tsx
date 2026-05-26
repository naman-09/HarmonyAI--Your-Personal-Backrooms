'use client';

export function ClientStyle({ children }: { children: string }) {
  return <style dangerouslySetInnerHTML={{ __html: children }} />;
}
