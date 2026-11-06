import { ToolMeta } from '../types';

export const TOOLS_DATA: ToolMeta[] = [
  {
    id: 'compressor',
    path: '/compressor',
    name: 'Compress Image',
    shortName: 'Compressor',
    title: 'Free Image Compressor - Reduce Image File Size Online',
    description: 'Compress JPG, PNG, and WebP images in your browser. Choose a quality level to balance output size and visual detail; results vary by image and format.',
    iconName: 'Minimize2',
    color: 'from-blue-500 to-indigo-600',
    badge: 'Popular',
    acceptedTypes: 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif',
    faqs: [
      {
        question: 'Does compressing images reduce image visual quality?',
        answer: 'Compression results depend on the image, output format, and quality setting. JPEG and lossy WebP can reduce file size by discarding image data; PNG output may be larger or smaller depending on the source. Preview the result before downloading.'
      },
      {
        question: 'Are my private photos uploaded to any remote server?',
        answer: 'The selected image is processed locally in your browser by the compressor. The page may still load scripts, fonts, analytics, ads, or other site resources over the network; see the Privacy Policy for those services.'
      },
      {
        question: 'Can I compress multiple images at once and download as a ZIP?',
        answer: 'Yes, PicShrink allows you to batch upload dozens of pictures simultaneously, tune quality in one click, and download individual files or all compressed images in a single ZIP file.'
      }
    ]
  },
  {
    id: 'bg-remover',
    path: '/bg-remover',
    name: 'Background Remover',
    shortName: 'BG Remover',
    title: 'Background Remover - Remove Image Background Free',
    description: 'Create transparent PNG cutouts with AI subject segmentation or browser-based color-boundary tools. Adjust the result and choose a transparent or solid-color background.',
    iconName: 'Scissors',
    color: 'from-pink-500 to-rose-600',
    badge: 'New',
    acceptedTypes: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
    faqs: [
      {
        question: 'How does client-side background removal work in PicShrink?',
        answer: 'PicShrink analyzes color boundaries, contrast differentials, and corner key color regions directly in your browser canvas. You can adjust tolerance, feathering, and choose transparent or solid replacement colors.'
      },
      {
        question: 'Can I replace the background with a custom solid color or keep it transparent?',
        answer: 'Yes! You can export as a transparent PNG cutout or pick any solid color (white, black, vibrant brand color) to replace the removed backdrop seamlessly.'
      },
      {
        question: 'Is there a limit on how many backgrounds I can remove?',
        answer: 'No limits, no watermarks, and no sign-up required. PicShrink is completely free and unlimited forever.'
      }
    ]
  },
  {
    id: 'resizer',
    path: '/resizer',
    name: 'Resize Image',
    shortName: 'Resizer',
    title: 'Image Resizer - Resize Images by Pixels & Percentage',
    description: 'Resize JPG, PNG, and WebP images by exact pixel dimensions or percentage scale. Lock aspect ratio, optimize resolution, and batch download free.',
    iconName: 'Maximize2',
    color: 'from-emerald-500 to-teal-600',
    acceptedTypes: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
    faqs: [
      {
        question: 'How do I maintain the original aspect ratio while resizing?',
        answer: 'Simply keep the "Lock Aspect Ratio" toggle enabled. When you enter a new width, PicShrink automatically calculates the matching height proportionally so your image never distorts.'
      },
      {
        question: 'Can I resize multiple images by percentage at once?',
        answer: 'Yes! Select the Percentage tab (e.g., 25%, 50%, 75%) and every uploaded image will scale down uniformly to that exact scale factor, ready for single or batch ZIP download.'
      },
      {
        question: 'What is the best resolution for social media posts?',
        answer: 'For Instagram square posts use 1080x1080px, for Instagram stories use 1080x1920px, and for Facebook/Twitter landscape feeds use 1200x630px.'
      }
    ]
  },
  {
    id: 'cropper',
    path: '/cropper',
    name: 'Crop Image',
    shortName: 'Cropper',
    title: 'Image Cropper - Crop Photos with Aspect Ratios Online',
    description: 'Crop images online with preset aspect ratios like 1:1, 16:9, 4:3, 9:16 or freeform crop box. Rotate, flip, preview, and download crisp crops instantly.',
    iconName: 'Crop',
    color: 'from-amber-500 to-orange-600',
    acceptedTypes: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
    faqs: [
      {
        question: 'Which aspect ratio presets are supported?',
        answer: 'PicShrink supports 1:1 (Square avatars, Instagram), 16:9 (YouTube thumbnails, HD monitors), 9:16 (Stories, TikTok, Reels), 4:3 (Standard photography), and Freeform custom dragging.'
      },
      {
        question: 'Can I rotate or flip my image before cropping?',
        answer: 'Yes! You can rotate 90 degrees clockwise or counterclockwise and flip horizontally/vertically before adjusting the crop area.'
      },
      {
        question: 'Does cropping reduce the resolution of the cropped area?',
        answer: 'No, PicShrink extracts the exact pixel coordinates from the source full-resolution image without unwanted downsampling.'
      }
    ]
  },
  {
    id: 'jpg-to-png',
    path: '/jpg-to-png',
    name: 'JPG to PNG',
    shortName: 'JPG to PNG',
    title: 'JPG to PNG Converter - Convert JPG to PNG Transparent Free',
    description: 'Convert JPG images to PNG in your browser. PNG uses lossless encoding for the newly created file, but conversion cannot restore image detail already lost through JPEG compression.',
    iconName: 'FileType2',
    color: 'from-purple-500 to-indigo-600',
    acceptedTypes: 'image/jpeg,image/jpg,.jpg,.jpeg,.jfif',
    faqs: [
      {
        question: 'Why convert JPG to PNG format?',
        answer: 'PNG uses lossless encoding, supports transparency, and is useful for graphics and screenshots. Converting a JPG to PNG does not restore detail previously discarded by JPEG compression, and the PNG file may be larger.'
      },
      {
        question: 'Does converting JPG to PNG make the background transparent?',
        answer: 'JPG does not contain alpha channels. To make the background transparent, use our free /bg-remover tool, which automatically outputs transparent PNGs.'
      },
      {
        question: 'Can I convert multiple JPG files simultaneously?',
        answer: 'Yes, drag and drop multiple JPG files into the upload box. PicShrink will convert them all in parallel and provide a one-click ZIP download.'
      }
    ]
  },
  {
    id: 'png-to-jpg',
    path: '/png-to-jpg',
    name: 'PNG to JPG',
    shortName: 'PNG to JPG',
    title: 'PNG to JPG Converter - Convert PNG to JPG Online Free',
    description: 'Convert PNG images to compact JPG format online for free. Adjust compression quality, select background fill color for transparent areas, and download fast.',
    iconName: 'FileImage',
    color: 'from-cyan-500 to-blue-600',
    acceptedTypes: 'image/png,.png',
    faqs: [
      {
        question: 'What happens to transparent pixels when converting PNG to JPG?',
        answer: 'Because JPEG format does not support transparency, PicShrink lets you choose a background fill color (white by default, or black/custom) so transparent areas blend cleanly.'
      },
      {
        question: 'How much smaller will the file size become?',
        answer: 'Converting heavy PNGs to JPEG can reduce file sizes by 60% to 85%, significantly speeding up website loading times and email attachments.'
      },
      {
        question: 'Can I choose the output JPEG quality?',
        answer: 'Yes, our quality slider allows you to select between 10% and 100% JPEG compression quality to get the ideal balance between crispness and compactness.'
      }
    ]
  },
  {
    id: 'webp-converter',
    path: '/webp-converter',
    name: 'WebP Converter',
    shortName: 'WebP Converter',
    title: 'WebP Converter - Convert Images to WebP Format Online',
    description: 'Convert JPG and PNG images to modern next-gen WebP format. Drastically boost Google PageSpeed with 30% smaller files and superior visual compression.',
    iconName: 'Zap',
    color: 'from-violet-500 to-purple-600',
    badge: 'Fast',
    acceptedTypes: 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif',
    faqs: [
      {
        question: 'Why is WebP recommended by Google PageSpeed?',
        answer: 'WebP images are 25-35% smaller than comparable JPEGs and PNGs at equivalent visual quality, dramatically improving mobile site speed and Core Web Vitals.'
      },
      {
        question: 'Do all modern browsers support WebP?',
        answer: 'Yes! Chrome, Firefox, Safari, Edge, and all modern mobile browsers on iOS and Android fully support the WebP format.'
      },
      {
        question: 'Does WebP support transparency like PNG?',
        answer: 'Yes! WebP supports both 8-bit alpha channel transparency and animation, giving you the best features of PNG and GIF with much smaller file sizes.'
      }
    ]
  },
  {
    id: 'image-to-pdf',
    path: '/image-to-pdf',
    name: 'Image to PDF',
    shortName: 'Image to PDF',
    title: 'Image to PDF Converter - Convert Multiple Images to PDF',
    description: 'Convert JPG, PNG, and WebP images to a single clean PDF document. Reorder pages, set page orientation and custom margins. 100% free and private.',
    iconName: 'FileText',
    color: 'from-red-500 to-rose-600',
    badge: 'Popular',
    acceptedTypes: 'image/jpeg,image/png,image/webp',
    faqs: [
      {
        question: 'Can I combine multiple pictures into a single multi-page PDF?',
        answer: 'Yes! Upload as many photos as you want, easily drag or click to reorder them in your desired sequence, and PicShrink compiles them into a unified PDF file.'
      },
      {
        question: 'Can I choose paper size and orientation?',
        answer: 'You can choose between A4 and US Letter page sizes, and switch orientation between Auto (adapts to each photo), Portrait, or Landscape mode.'
      },
      {
        question: 'Is my confidential document safe when generating PDFs?',
        answer: 'Completely safe. The PDF document is built directly in your local browser memory using jsPDF. Nothing is sent across the internet.'
      }
    ]
  },
  {
    id: 'filters',
    path: '/filters',
    name: 'Photo Filters',
    shortName: 'Filters',
    title: 'Free Photo Filters - Apply Grayscale, Sepia, Invert & Blur',
    description: 'Apply aesthetic photo filters online for free. Grayscale, vintage sepia, color invert, blur, contrast and brightness with 100% private in-browser editing.',
    iconName: 'Wand2',
    color: 'from-amber-500 to-rose-600',
    badge: 'New',
    acceptedTypes: 'image/jpeg,image/png,image/webp',
    faqs: [
      {
        question: 'What photo filters can I apply on PicShrink?',
        answer: 'You can adjust Grayscale (black & white), Sepia (vintage warm tone), Invert (neon negative), Blur, Brightness, Contrast, Saturation, and Hue-Rotate with instant visual feedback.'
      },
      {
        question: 'How does client-side Canvas filtering work?',
        answer: 'PicShrink leverages the native HTML5 Canvas 2D graphics engine inside your browser. No files are uploaded to any server, making filtering instantaneous and 100% private.'
      },
      {
        question: 'Can I apply filters to multiple images at once and download as a ZIP?',
        answer: 'Yes! Upload multiple images at once, tune your filter sliders, and download individual files or the entire batch bundled into a single ZIP archive.'
      }
    ]
  }
];
