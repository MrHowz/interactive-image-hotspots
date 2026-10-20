# QA inventory 3.0.0

Claims: click once in Explore opens a personal image from points, rectangle/ellipse/freehand interiors, grid unions and linked tokens. GM and player borders are independent and hiding borders preserves hit detection. Drawing is local until saving; cancel never creates an orphan. Areas persist, move/scale and remain scene-scoped. Token links remain editable without changing token geometry.

Controls and checks:
- Explore active/idle → click area/token viewer; blank map no modal; drag does not open.
- Point click; rectangle/ellipse drag; freehand enclosed drag → editor; save/cancel.
- Grid add/remove cells → count/local preview; Done/Enter → editor; Escape/Cancel clears.
- Editor URL/file preview, save, close; GM/player border off/on; Enabled/Players; x/y/scale.
- Token select/link/edit/unlink; area edit/delete confirmation/keep.
- Viewer zoom +/- reset/pan/close/retry, mouse and narrow screen layout.
- Role, scene and theme switching; reload persists.
- Off-path: cancel/scene change during draw; multiple rapid clicks; disabled area; freehand concave gap; grid empty and non-square; deleted target while editing.
- Visual evidence: populated/empty panel at 420 and 320 px, local draft outlines, hidden player outlines, editor top/bottom, viewer. Inspect screenshots and numeric bounds separately from functional checks.

Real Owlbear gate: native pointer dispatch, Move-like dragging, token hit testing, local overlay appearance on actual map, Assets native upload/picker, multiplayer/touch. Simulated host tests cannot certify these.
