import React, { useCallback, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { Loader2 } from 'lucide-react';

/**
 * PrintWrapper.tsx
 * Composant réutilisable pour imprimer *uniquement* une zone donnée du DOM
 * - Clone la zone cible dans un iframe isolé
 * - Copie les <link rel="stylesheet"> et <style> du document parent
 * - Lance la commande print() sur l'iframe (donc le sidebar et autres éléments externes ne sont pas imprimés)
 *
 * Usage (en prose) :
 * 1) Place un ref sur le conteneur que tu veux imprimer (ex: <div ref={printableRef}>...)</n * 2) Importe PrintButton et passe-lui `targetRef={printableRef}`
 * 3) Le bouton gère la création de l'iframe, l'injection des styles et le print isolé
 *
 * Conception : TypeScript + React, pas d'effet secondaire global — bon pour être importé dans plusieurs contextes.
 */

type PrintOptions = {
  title?: string; // titre du document imprimé
  extraCss?: string; // CSS additionnel injecté dans l'iframe
  removeAfterMs?: number; // délai avant suppression de l'iframe après impression
};

function copyStylesToDoc(sourceDoc: Document, targetDoc: Document) {
  // Copier les <link rel="stylesheet"> externes
  Array.from(sourceDoc.querySelectorAll('link[rel="stylesheet"]')).forEach((link) => {
    const href = (link as HTMLLinkElement).href;
    if (href) {
      const newLink = targetDoc.createElement('link');
      newLink.rel = 'stylesheet';
      newLink.href = href;
      targetDoc.head.appendChild(newLink);
    }
  });

  // Copier les <style> inline
  Array.from(sourceDoc.querySelectorAll('style')).forEach((style) => {
    const newStyle = targetDoc.createElement('style');
    newStyle.textContent = style.textContent || '';
    targetDoc.head.appendChild(newStyle);
  });
}

export async function printElement(element: HTMLElement, options: PrintOptions = {}) {
  if (!element) {
    console.warn('printElement: élément cible introuvable');
    return;
  }

  const { title = '', extraCss = '', removeAfterMs = 1000 } = options;

  // Création de l'iframe isolée
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);
  const iframeDoc = iframe.contentDocument;
  const iframeWin = iframe.contentWindow;

  if (!iframeDoc || !iframeWin) {
    console.error('Impossible d’initialiser l’iframe pour l’impression');
    document.body.removeChild(iframe);
    return;
  }

  // Construire la structure HTML minimale
  iframeDoc.open();
  iframeDoc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
  iframeDoc.close();

  // Copier styles et ajouter du CSS optionnel
  try {
    copyStylesToDoc(document, iframeDoc);
  } catch (err) {
    // Certaines feuilles de style cross-origin peuvent lever une exception ; on l'ignore.
    // Nous continuerons avec les styles copiés là où possible.
    // Ceci est une garantie de robustesse — principe de découplage.
    // eslint-disable-next-line no-console
    console.warn('printElement: erreur lors de la copie des styles (peut être cross-origin)', err);
  }

  if (extraCss) {
    const s = iframeDoc.createElement('style');
    s.textContent = extraCss;
    iframeDoc.head.appendChild(s);
  }

  if (title) {
    const t = iframeDoc.createElement('title');
    t.textContent = title;
    iframeDoc.head.appendChild(t);
  }

  // Cloner le noeud cible (deep clone) et insérer dans l'iframe
  const clone = element.cloneNode(true) as HTMLElement;

  // Réparer les valeurs des inputs/textarea/select en copiant leur état
  // (car cloneNode ne copie pas toujours la valeur actuelle)
  const originalInputs = Array.from(element.querySelectorAll('input, textarea, select'));
  const clonedInputs = Array.from(clone.querySelectorAll('input, textarea, select'));
  
  originalInputs.forEach((orig, index) => {
    const val = (orig as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    const target = clonedInputs[index] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (target) {
      target.value = val;
      // Pour les checkboxes/radios
      if (orig instanceof HTMLInputElement && (orig.type === 'checkbox' || orig.type === 'radio')) {
        (target as HTMLInputElement).checked = orig.checked;
      }
    }
  });

  // Insérer le cloné
  iframeDoc.body.appendChild(clone);

  // Attendre que les ressources (feuilles) soient chargées avant d'imprimer
  const tryPrint = () => {
    try {
      // Focus et print — isolation garantie : seule la zone clonée sortira sur papier
      iframeWin.focus();
      // Certains navigateurs exigent que print() soit déclenché par une action utilisateur —
      // ici le composant PrintButton l'appelle donc la contrainte est respectée.
      iframeWin.print();
    } catch (err) {
      console.error('Erreur lors de l\'appel à print() sur l\'iframe', err);
    }

    // Nettoyage (retarder légèrement pour laisser le job d'impression démarrer)
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch (e) { /* ignore */ }
    }, removeAfterMs);
  };

  // Si l'iframe a un onload, l'utiliser ; sinon fallback timeout
  let printed = false;

  const onLoadHandler = () => {
    if (printed) return;
    printed = true;
    tryPrint();
  };

  iframe.addEventListener('load', onLoadHandler);

  // fallback : si load ne se déclenche pas, tenter après 250ms
  setTimeout(() => {
    if (!printed) onLoadHandler();
  }, 250);
}

// ---------- Hook utilitaire et composant bouton réutilisable ----------

type PrintButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  targetRef: React.RefObject<HTMLElement>;
  title?: string;
  extraCss?: string;
  className?: string;
  children?: React.ReactNode;
};

export default function PrintButton({ targetRef, title, extraCss, className, children, ...btnProps }: PrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const toast = useToast();

  const handlePrint = useCallback(async () => {
    const el = targetRef?.current;
    if (!el) {
      console.warn('PrintButton: targetRef.current is null');
      return;
    }

    try {
      setIsPrinting(true);
      toast.info('Préparation de l\'impression...',2000 );
      
      // Laisser un petit délai pour que le toast apparaisse et que l'utilisateur voie l'état de chargement
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await printElement(el, { title, extraCss });
    } catch (error) {
      console.error('Erreur d\'impression:', error);
      toast.error('Erreur lors de la préparation de l\'impression');
    } finally {
      // On retire l'état de chargement après un court délai car l'iframe 
      // de print() bloque souvent le thread ou met du temps à se fermer
      setTimeout(() => setIsPrinting(false), 2000);
    }
  }, [targetRef, title, extraCss, toast]);

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={isPrinting || btnProps.disabled}
      className={`${className || 'inline-flex items-center gap-2 px-3 py-2 rounded-md border'} ${isPrinting ? 'opacity-70 cursor-not-allowed' : ''}`}
      {...btnProps}
    >
      {isPrinting ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>Préparation...</span>
        </>
      ) : (
        children ?? 'Imprimer (zone)'
      )}
    </button>
  );
}
