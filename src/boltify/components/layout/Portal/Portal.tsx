'use client';

import { FC, ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface IPortalProps {
  children: ReactNode;
  id?: string;
}

const Portal: FC<IPortalProps> = ({ id = 'portal-root', children }) => {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let el = document.getElementById(id) as HTMLElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
    setMount(el);
  }, [id]);

  if (!mount) return null;
  return createPortal(children, mount);
};

export default Portal;
