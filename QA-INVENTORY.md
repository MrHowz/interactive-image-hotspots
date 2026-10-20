# QA inventory — object links 2.0.0

Use tests/harness.html only as a simulated SDK host; production excludes the harness.

| Claim / controls | Functional check | Visual state / evidence |
| --- | --- | --- |
| Select token or drawing, Link image / Edit | select exactly one; save URL; reopen and edit title | selected card, editor, linked list |
| Native selection menu Link / Open | emit installed SDK context-menu callbacks from host menu buttons | editor and personal viewer |
| URL Preview, file selection, cancel, Browse Assets, Upload | URL preview and error; local file preview/cancel; asset upload/picker requires real room | editor preview/error/file preview |
| Enabled / Players | change, save, switch GM/Player, restore | player empty vs allowed list |
| Open, zoom +/−, Reset, drag, Escape/Close, Retry | open saved image, zoom cycle, pan, close; failed source retry | fullscreen image and error |
| Unlink confirmation / Keep | cancel then confirm; original object survives | confirmation then empty list |
| Persistent item metadata, movement | reload; move original item; link remains | link list after reload/move |
| Scene / role / theme changes | scene A→B→A; GM→Player→GM; dark→light→dark | empty state, GM/player, light panel |
| Off-happy-path | multiple selection disables linking; delete target while editor open; unsafe/failed URL | disabled CTA, deletion error |
| Layout / accessibility | keyboard focus, 420px and 320px panel, editor and viewer; numeric bounds plus screenshot inspection | initial + populated + editor + viewer |

Manual real-room gate: native Owlbear selection menu placement, permissions on different layers, native asset upload/picker persistence, player session on another device, fog behavior, touch pinch. Do not report these as passed from the host emulator.
