/**
 * @file markdown.js
 * @description A simple wrapper for a Markdown rendering library.
 * This module initializes and configures the Markdown-it library
 * and exports a configured instance for use throughout the application.
 */

// We will use the 'markdown-it' library. For now, we'll assume it's globally available
// or will be bundled. In a real project, you'd `npm install markdown-it`.
// For the purpose of this refactor, we'll define a placeholder.

/**
 * A placeholder markdown renderer that simulates the markdown-it library's interface.
 * In a real implementation, this would be `new MarkdownIt()`.
 * This placeholder will just wrap code in `<pre><code>` and other simple tags.
 */
const markdownRenderer = {
    render: (text) => {
        // A very basic "renderer" for demonstration purposes.
        // It's not a full markdown parser.
        let html = text
            // Escape basic HTML characters
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#039;');

        // Bold and Italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Code blocks
        html = html.replace(/```(\w*)\n([\s\S]*?)\n```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang || ''}">${code.trim()}</code></pre>`;
        });
        
        // Inline code
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');

        // Paragraphs (simple version)
        html = html.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

        return html;
    }
};


/**
 * The configured markdown-it instance.
 * @type {{render: function(string): string}}
 */
export const markdown = markdownRenderer;