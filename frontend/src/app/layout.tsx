import './globals.css';

export const metadata = {
  title: 'SubStudio',
  description: 'Automated video transcription and translation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white antialiased">
        {/* Client-side "Anti-Black Screen" Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return;
                
                const checkInterval = setInterval(() => {
                  // A "Black Screen" in dev often means the root div is empty
                  const root = document.querySelector('body');
                  const isVisible = document.querySelector('main') || document.querySelector('aside');
                  
                  if (!isVisible) {
                    console.log("SubStudio: Detection active... waiting for compilation.");
                    
                    fetch(window.location.href, { method: 'HEAD' })
                      .then(res => {
                        if (res.ok) {
                          // Server is ready, but if we still see nothing, force the reload
                          console.log("SubStudio: Server ready! Refreshing...");
                          window.location.reload();
                        }
                      })
                      .catch(() => { /* Server still compiling/restaring */ });
                  } else {
                    // Content is visible, we can stop watching
                    clearInterval(checkInterval);
                  }
                }, 3000);
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}