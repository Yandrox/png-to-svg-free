/* Bilingual dictionary (ES/EN). Classic script so it also works from file:// */
(function () {
  'use strict';
  var NS = window.P2S = window.P2S || {};

  var dict = {
    es: {
      appName: 'PNG a SVG',
      appTagline: 'Vectoriza tus imágenes sin conexión',
      offlineBadge: '100% sin conexión',
      installButton: 'Instalar app',
      sourceTitle: '1. Elige una imagen',
      uploadTitle: 'Suelta tu PNG aquí',
      uploadHint: 'Haz clic para buscar o pega una imagen con Ctrl+V',
      samplesTitle: 'O prueba con un ejemplo:',
      sampleLogo: 'Logo',
      sampleBadge: 'Insignia',
      sampleScene: 'Paisaje',
      optionsTitle: '2. Ajustes de conversión',
      modeLabel: 'Modo',
      modeMono: 'Blanco y negro (trazado)',
      modeColor: 'Color (cuantizado)',
      modeGray: 'Escala de grises',
      modeEmbed: 'Incrustar PNG (sin pérdida)',
      modeHintMono: 'Traza el contorno de las zonas oscuras como paths vectoriales.',
      modeHintColor: 'Reduce la imagen a unos pocos colores y traza cada uno como un path.',
      modeHintGray: 'Igual que color, pero usando tonos de gris.',
      modeHintEmbed: 'Envuelve el PNG original dentro de un SVG. Sin pérdida, no es vectorial.',
      thresholdLabel: 'Umbral',
      thresholdHint: 'Los píxeles más oscuros se convierten en forma.',
      colorsLabel: 'Número de colores',
      colorsHint: 'Menos colores = SVG más simple y ligero.',
      simplifyLabel: 'Simplificación',
      simplifyHint: 'Reduce puntos; valores altos dan trazos más limpios.',
      minAreaLabel: 'Área mínima (ruido)',
      minAreaHint: 'Descarta contornos más pequeños que este valor en px².',
      smoothLabel: 'Suavizado',
      smoothHint: 'Convierte esquinas en curvas Bézier.',
      precisionLabel: 'Decimales en las coordenadas',
      invertLabel: 'Invertir',
      outlineLabel: 'Solo contorno',
      backgroundLabel: 'Fondo blanco',
      convertButton: 'Convertir a SVG',
      downloadButton: 'Descargar SVG',
      copyButton: 'Copiar código',
      resetButton: 'Reiniciar',
      previewTitle: '3. Resultado',
      originalLabel: 'Original',
      vectorLabel: 'SVG',
      emptyPreview: 'La imagen aparecerá aquí',
      codeTitle: 'Ver código SVG',
      statusReady: 'Listo para empezar.',
      statusLoaded: 'Imagen cargada. Ajusta los parámetros y convierte.',
      statusConverting: 'Vectorizando… esto puede tardar unos segundos.',
      statusConverted: '¡Listo! SVG generado.',
      statusError: 'Ha ocurrido un error.',
      errorInvalid: 'Selecciona un archivo de imagen válido (PNG preferido).',
      errorTooBig: 'La imagen es muy grande; se ha reducido para procesarla más rápido.',
      errorConvert: 'No se pudo convertir la imagen. Prueba con otro modo o ajuste.',
      errorClipboard: 'No se pudo copiar. Selecciona el código manualmente.',
      copied: 'Código SVG copiado al portapapeles.',
      downloaded: 'SVG descargado.',
      footerNote: 'Todo se procesa en tu dispositivo. Tus imágenes nunca se suben a ningún servidor.',
      pwaNote: 'Instálala desde el navegador para usarla sin conexión.',
      statDimensions: 'Dimensiones',
      statOriginal: 'Archivo PNG',
      statColors: 'Colores / niveles',
      statPaths: 'Paths generados',
      statSize: 'Tamaño SVG',
      statPixels: 'Píxeles procesados',
      fileLabel: 'Archivo',
      themeLight: 'Cambiar a tema claro',
      themeDark: 'Cambiar a tema oscuro',
      installHint: 'Instalar para usar sin conexión',
      downscaled: 'Imagen reducida a {w}×{h} px para acelerar el trazado.',
      noPaths: 'No se encontraron formas. Prueba a cambiar el umbral o invertir.',
      embedNote: 'Modo sin pérdida: el SVG contiene el PNG original.',
      readyToInstall: 'La app se puede instalar.'
    },
    en: {
      appName: 'PNG to SVG',
      appTagline: 'Vectorize your images offline',
      offlineBadge: '100% offline',
      installButton: 'Install app',
      sourceTitle: '1. Choose an image',
      uploadTitle: 'Drop your PNG here',
      uploadHint: 'Click to browse or paste an image with Ctrl+V',
      samplesTitle: 'Or try a sample:',
      sampleLogo: 'Logo',
      sampleBadge: 'Badge',
      sampleScene: 'Scene',
      optionsTitle: '2. Conversion settings',
      modeLabel: 'Mode',
      modeMono: 'Black & white (traced)',
      modeColor: 'Color (quantized)',
      modeGray: 'Grayscale',
      modeEmbed: 'Embed PNG (lossless)',
      modeHintMono: 'Traces dark areas as vector paths.',
      modeHintColor: 'Reduces the image to a few colors and traces each one as a path.',
      modeHintGray: 'Same as color, using gray tones.',
      modeHintEmbed: 'Wraps the original PNG in an SVG. Lossless, but not vector.',
      thresholdLabel: 'Threshold',
      thresholdHint: 'Darker pixels become shapes.',
      colorsLabel: 'Number of colors',
      colorsHint: 'Fewer colors = simpler, lighter SVG.',
      simplifyLabel: 'Simplification',
      simplifyHint: 'Removes points; higher values give cleaner outlines.',
      minAreaLabel: 'Minimum area (noise)',
      minAreaHint: 'Discards contours smaller than this value in px².',
      smoothLabel: 'Smoothing',
      smoothHint: 'Turns corners into Bézier curves.',
      precisionLabel: 'Coordinate decimals',
      invertLabel: 'Invert',
      outlineLabel: 'Outline only',
      backgroundLabel: 'White background',
      convertButton: 'Convert to SVG',
      downloadButton: 'Download SVG',
      copyButton: 'Copy code',
      resetButton: 'Reset',
      previewTitle: '3. Result',
      originalLabel: 'Original',
      vectorLabel: 'SVG',
      emptyPreview: 'Your image will appear here',
      codeTitle: 'View SVG code',
      statusReady: 'Ready to start.',
      statusLoaded: 'Image loaded. Adjust the settings and convert.',
      statusConverting: 'Vectorizing… this may take a few seconds.',
      statusConverted: 'Done! SVG generated.',
      statusError: 'Something went wrong.',
      errorInvalid: 'Please choose a valid image file (PNG preferred).',
      errorTooBig: 'The image was very large; it was resized for faster processing.',
      errorConvert: 'Could not convert the image. Try another mode or setting.',
      errorClipboard: 'Could not copy. Please select the code manually.',
      copied: 'SVG code copied to clipboard.',
      downloaded: 'SVG downloaded.',
      footerNote: 'Everything is processed on your device. Your images are never uploaded.',
      pwaNote: 'Install it from your browser to use it offline.',
      statDimensions: 'Dimensions',
      statOriginal: 'PNG file',
      statColors: 'Colors / levels',
      statPaths: 'Paths generated',
      statSize: 'SVG size',
      statPixels: 'Pixels processed',
      fileLabel: 'File',
      themeLight: 'Switch to light theme',
      themeDark: 'Switch to dark theme',
      installHint: 'Install to use offline',
      downscaled: 'Image resized to {w}×{h} px to speed up tracing.',
      noPaths: 'No shapes found. Try changing the threshold or inverting.',
      embedNote: 'Lossless mode: the SVG contains the original PNG.',
      readyToInstall: 'The app is ready to install.'
    }
  };

  var current = 'es';

  function detect() {
    try {
      var saved = localStorage.getItem('p2s.lang');
      if (saved && dict[saved]) return saved;
    } catch (e) { /* storage may be disabled */ }
    return String(navigator.language || '').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
  }

  function get() { return current; }

  function t(key, vars) {
    var text = (dict[current] && dict[current][key]) || dict.en[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        text = text.split('{' + k + '}').join(String(vars[k]));
      });
    }
    return text;
  }

  function apply(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }
    document.documentElement.lang = current;
    document.title = t('appName') + ' · ' + (current === 'es' ? 'Convertidor PNG a SVG' : 'PNG to SVG converter');
  }

  function set(lang) {
    if (!dict[lang]) return current;
    current = lang;
    try { localStorage.setItem('p2s.lang', lang); } catch (e) { /* ignore */ }
    apply();
    return current;
  }

  function toggle() { return set(current === 'es' ? 'en' : 'es'); }

  current = detect();

  NS.I18n = {
    t: t,
    apply: apply,
    set: set,
    get: get,
    toggle: toggle,
    languages: ['es', 'en']
  };
})();
