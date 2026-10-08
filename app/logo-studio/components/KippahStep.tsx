'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import s from '../LogoStudio.module.css';
import { studioApi, ApiError, type CatalogProduct } from '../studioApi';
import type { ResolvedSelection, KippahSide } from '@/lib/logoStudio/catalog';
import { isVisualOption } from '@/lib/logoStudio/catalog';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

const SOURCE_LABEL: Record<string, string> = { variant: 'לפי הווריאציה שבחרתם', catalog: 'לפי נתוני הקטלוג', name: 'לפי שם המוצר' };

export function selectionStatusText(sel: ResolvedSelection): { kind: 'ok' | 'warn' | 'error'; text: string } {
  switch (sel.imageStatus) {
    case 'ok': return { kind: 'ok', text: `${sel.side === 'bottom' ? 'תמונת הצד התחתון' : sel.image?.source === 'variant' ? 'תמונת הווריאציה שבחרתם' : 'תמונת המוצר'} תשמש להדמיה.` };
    case 'choose_variant': return { kind: 'warn', text: `נא לבחור ${sel.missingOptions.join(' ו')} כדי שנציג את הכיפה המדויקת.` };
    case 'no_bottom_image': return { kind: 'warn', text: 'לכיפה זו עדיין אין תמונה של הצד התחתון, ולכן אי אפשר להציג עליו הדמיה. אפשר לעצב לצד העליון, או לעצב עכשיו ולפנות אלינו לגבי ההדמיה.' };
    case 'missing_variant_image': return { kind: 'warn', text: 'לווריאציה שבחרתם אין עדיין תמונה מתאימה, ולכן לא נוכל להציג עליה הדמיה מדויקת. אפשר להמשיך לעצב את הלוגו, לבחור צבע אחר, או לפנות אלינו.' };
    default: return { kind: 'error', text: 'למוצר זה אין תמונה מתאימה להדמיה.' };
  }
}

interface Props {
  product: CatalogProduct | null;
  selection: ResolvedSelection | null;
  selectedVariants: Record<string, string>;
  side: KippahSide;
  onChangeSide: (s: KippahSide) => void;
  loading: boolean;
  error: string | null;
  onChooseProduct: (productId: string) => void;
  onChangeVariant: (name: string, value: string) => void;
  onNext: () => void;
}

export default function KippahStep(p: Props) {
  const [list, setList] = useState<CatalogProduct[] | null>(null);
  const [showListState, setShowList] = useState(false);
  const showList = showListState || !p.product;
  const [listErr, setListErr] = useState<string | null>(null);

  useEffect(() => {
    if (!showList || list) return;
    studioApi.catalogList().then(r => setList(r.products)).catch(e => setListErr(e instanceof ApiError ? e.messageHe ?? 'טעינת הכיפות נכשלה.' : 'טעינת הכיפות נכשלה.'));
  }, [showList, list]);


  const status = p.selection ? selectionStatusText(p.selection) : null;
  const img = p.selection?.image?.url ?? p.product?.imgUrl ?? null;

  return (
    <div>
      {p.loading && <div className={s.card}><div className={s.loadingCard}><span className={`${s.spinner} ${s.spinnerDark}`} /> טוען את הכיפה…</div></div>}
      {p.error && <div className={s.error} role="alert">{p.error}</div>}

      {p.product && p.selection && !p.loading && (
        <div className={s.card}>
          <p className={s.cardTitle}>הכיפה שבחרתם</p>
          <div className={s.productRow}>
            {img ? <img className={s.productImg} src={optimizeCloudinaryUrl(img, 200)} alt={p.product.name} /> : <div className={s.productImg} />}
            <div className={s.meta}>
              <div style={{ fontWeight: 800 }}>{p.product.name}</div>
              <div>סוג בד: <b>{p.selection.material?.value ?? 'לא צוין בקטלוג'}</b>{p.selection.material && <span className={s.src}> · {SOURCE_LABEL[p.selection.material.source]}</span>}</div>
              <div>צבע: <b>{p.selection.color?.value ?? 'לא צוין בקטלוג'}</b>{p.selection.color && <span className={s.src}> · {SOURCE_LABEL[p.selection.color.source]}</span>}</div>
            </div>
          </div>

          {p.product.variantOptions.map(opt => (
            <div key={opt.name}>
              <span className={s.label}>{opt.name}{isVisualOption(opt.name) ? '' : ' (לא משפיע על ההדמיה)'}</span>
              <div className={s.chips}>
                {opt.values.map(v => (
                  <button key={v} type="button" className={s.chip} data-active={p.selectedVariants[opt.name] === v} onClick={() => p.onChangeVariant(opt.name, v)}>{v}</button>
                ))}
              </div>
            </div>
          ))}

          <span className={s.label}>איפה יודפס הלוגו?</span>
          <div className={s.chips}>
            {(['top', 'bottom'] as KippahSide[]).map(sd => (
              <button key={sd} type="button" className={s.chip} data-active={p.side === sd} onClick={() => p.onChangeSide(sd)}>
                {sd === 'top' ? 'צד עליון' : 'צד תחתון (פנים הכיפה)'}
                {p.selection && !p.selection.sidesAvailable[sd] && p.selection.imageStatus !== 'choose_variant' ? ' · אין תמונה' : ''}
              </button>
            ))}
          </div>
          <div className={s.hint}>רוצים גם וגם? מעצבים צד אחד, מאשרים, ואז מוסיפים עיצוב לצד השני (+₪1.5 לכיפה).</div>

          {status && <div className={status.kind === 'ok' ? s.ok : status.kind === 'warn' ? s.warn : s.error}>{status.text}</div>}
          <div className={s.row} style={{ marginTop: 10 }}>
            <button type="button" className={s.ghost} onClick={() => setShowList(v => !v)}>{showList ? 'סגירת הרשימה' : 'החלפת כיפה'}</button>
          </div>
        </div>
      )}

      {showList && (
        <div className={s.card}>
          <p className={s.cardTitle}>{p.product ? 'בחרו כיפה אחרת' : 'בחרו כיפה לעיצוב'}</p>
          {listErr && <div className={s.error}>{listErr}</div>}
          {!list && !listErr && <div className={s.loadingCard}><span className={`${s.spinner} ${s.spinnerDark}`} /> טוען…</div>}
          {list && (
            <div className={s.fontGrid}>
              {list.map(item => (
                <button key={item.id} type="button" className={s.fontTile} data-active={p.product?.id === item.id}
                  onClick={() => { p.onChooseProduct(item.id); setShowList(false); }}>
                  {item.imgUrl && <img src={optimizeCloudinaryUrl(item.imgUrl, 200)} alt="" style={{ width: '100%', height: 90, objectFit: 'contain' }} />}
                  <div className={s.fontName} style={{ color: '#3b3b41', fontWeight: 700 }}>{item.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={s.sticky}>
        <div className={s.stickyInner}>
          <button type="button" className={s.primary} disabled={!p.product || p.loading} onClick={p.onNext}>המשך להתאמת הלוגו ←</button>
        </div>
      </div>
    </div>
  );
}
