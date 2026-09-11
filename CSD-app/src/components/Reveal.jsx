import {useEffect, useRef, useState} from 'react';

/**
 * Появление блока при прокрутке. То, что уже в зоне видимости, показывается
 * сразу — иначе при сбое наблюдателя первый экран остался бы пустым.
 */
export function Reveal({children, delay = false, as: Tag = 'div', className = '', ...rest}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      {threshold: 0.12}
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={[
        'reveal',
        visible && 'is-visible',
        delay && '[animation-delay:.1s]',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
