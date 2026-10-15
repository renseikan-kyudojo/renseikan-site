// Studio inputs so an HDR photo is uploaded once. Sanity strips the gain map from an Ultra HDR JPEG uploaded as an image
// but keeps it in a file (see sanity/hdr.js), so a photo needs both: the image for the grid and resized copies, the
// file as its HDR original. These make both from the one file the editor gives.
//
// PhotosInput (an album's Photos): files dropped on the list, or chosen with "Add photos", become one photo each, and
// each Ultra HDR JPEG is also kept as that photo's HDR original, as scripts/upload-photos.mjs does.
// ImageFromHdrInput (an album photo, or a Gallery photo's Image): when the HDR original is set and the Image is empty,
// the Image is made from the HDR original, so an HDR photo can be added through its HDR original alone.
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import {
  insert,
  set,
  setIfMissing,
  useClient,
  useFormValue,
  type ArrayOfObjectsInputProps,
  type ObjectInputProps,
} from 'sanity';
import { Button, Flex, Stack, Text } from '@sanity/ui';
import { hasGainMap } from '../hdr.js';
import { SANITY_API_VERSION } from '../project';

const ref = (id: string) => ({ _type: 'reference', _ref: id });
const newKey = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function PhotosInput(props: ArrayOfObjectsInputProps) {
  const { onChange, readOnly } = props;
  const client = useClient({ apiVersion: SANITY_API_VERSION });
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const add = useCallback(
    async (files: File[]) => {
      const photos = files.filter((f) => f.type.startsWith('image/'));
      if (!photos.length) return;
      setBusy(true);
      let hdr = 0;
      try {
        for (const [n, file] of photos.entries()) {
          setStatus(`Uploading ${n + 1} of ${photos.length}: ${file.name}`);
          const isHdr = file.type === 'image/jpeg' && hasGainMap(new Uint8Array(await file.arrayBuffer()));
          const [image, original] = await Promise.all([
            client.assets.upload('image', file, { filename: file.name }),
            isHdr ? client.assets.upload('file', file, { filename: file.name, contentType: 'image/jpeg' }) : null,
          ]);
          if (original) hdr++;
          const item = {
            _type: 'image',
            _key: newKey(),
            asset: ref(image._id),
            ...(original ? { hdr: { _type: 'file', asset: ref(original._id) } } : {}),
          };
          onChange([setIfMissing([]), insert([item], 'after', [-1])]);
        }
        setStatus(`Added ${plural(photos.length, 'photo')}${hdr ? `, ${hdr} with an HDR original` : ''}.`);
      } catch (e) {
        setStatus(`Upload stopped: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setBusy(false);
      }
    },
    [client, onChange],
  );

  // Files dropped anywhere on the list come here instead of the default upload, which would lose their HDR
  const onDrop = (e: DragEvent) => {
    const files = [...e.dataTransfer.files];
    if (!files.length || readOnly || busy) return;
    e.preventDefault();
    e.stopPropagation();
    void add(files);
  };

  return (
    <Stack gap={3}>
      <Flex gap={3} align="center" wrap="wrap">
        <Button
          text="Add photos"
          mode="ghost"
          disabled={readOnly || busy}
          loading={busy}
          onClick={() => picker.current?.click()}
        />
        {status && (
          <Text size={1} muted>
            {status}
          </Text>
        )}
      </Flex>
      <input
        ref={picker}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void add([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
      <div
        onDragOverCapture={(e) => e.dataTransfer.types.includes('Files') && !readOnly && e.preventDefault()}
        onDropCapture={onDrop}
      >
        {props.renderDefault(props)}
      </div>
    </Stack>
  );
}

interface HdrImageValue {
  asset?: { _ref?: string };
  hdr?: { asset?: { _ref?: string } };
}

export function ImageFromHdrInput(props: ObjectInputProps) {
  const { onChange, readOnly, path } = props;
  const value = props.value as HdrImageValue | undefined;
  const client = useClient({ apiVersion: SANITY_API_VERSION });
  // the HDR original is inside an album photo, and beside the Image on a Gallery photo
  const sibling = useFormValue([...path.slice(0, -1), 'hdr']) as HdrImageValue['hdr'];
  const hdrRef = value?.hdr?.asset?._ref ?? sibling?.asset?._ref;
  const imageRef = value?.asset?._ref;
  const tried = useRef<string | undefined>(undefined);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!hdrRef || imageRef || readOnly || tried.current === hdrRef) return;
    tried.current = hdrRef;
    setStatus('Making the Image from the HDR original…');
    (async () => {
      const file = await client.getDocument<{ url: string; originalFilename?: string }>(hdrRef);
      if (!file?.url) throw new Error('the HDR original was not found');
      const res = await fetch(file.url);
      if (!res.ok) throw new Error(`could not read the HDR original (${res.status})`);
      const image = await client.assets.upload('image', await res.blob(), {
        filename: file.originalFilename,
      });
      onChange([setIfMissing({ _type: 'image' }), set(ref(image._id), ['asset'])]);
      setStatus('');
    })().catch((e) => setStatus(`Could not make the Image: ${e instanceof Error ? e.message : String(e)}`));
  }, [hdrRef, imageRef, readOnly, client, onChange]);

  return (
    <Stack gap={3}>
      {status && (
        <Text size={1} muted>
          {status}
        </Text>
      )}
      {props.renderDefault(props)}
    </Stack>
  );
}
