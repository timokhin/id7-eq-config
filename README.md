# EQ Config

EQ Config is an audio configuration app for BMW iDrive 7 / MGU. It provides editable sound profiles, a visual sound-stage control, and a surround switch. Use the touchscreen or the iDrive controller.

> **Compatibility:** Tested on iDrive 7 (ID7) with Harman Kardon audio. Other audio systems, vehicles, and MGU software versions have not been verified. Audio property mappings may differ between configurations.

## Built-in profiles

Default settings before any user edits. All values are relative ticks on the −10 to +10 scale; surround is off by default. Profiles are starting points, not calibrated recommendations, and can be adjusted to your vehicle and preference. Balance, fade, and surround level are controlled separately.

| Profile | Bass | 100 Hz | 200 Hz | 500 Hz | 1 kHz | 2 kHz | 5 kHz | 10 kHz | Treble | Surround |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Classical | 0 | 0 | 0 | 0 | 0 | 0 | -3 | -4 | -2 | Off |
| Club | 0 | 0 | 0 | 3 | 3 | 3 | 2 | 0 | 1 | Off |
| Dance | 2 | 4 | 3 | 0 | 0 | -2 | -4 | -4 | -2 | Off |
| Pop | 1 | 0 | 2 | 4 | 3 | 0 | -1 | -2 | -1 | Off |
| Reggae | 0 | 0 | 0 | -3 | 0 | 2 | 3 | 1 | 1 | Off |
| Rock | 1 | 3 | 1 | -4 | -2 | 0 | 4 | 5 | 2 | Off |
| Soft | 1 | 2 | 0 | -1 | -1 | 1 | 4 | 5 | 2 | Off |
| Ska | -1 | -2 | -3 | -1 | 2 | 3 | 4 | 5 | 2 | Off |
| Soft Rock | 1 | 2 | 2 | 0 | -2 | -3 | -2 | -1 | -1 | Off |
| Techno | 2 | 4 | 2 | -2 | -3 | -1 | 3 | 5 | 2 | Off |

Three custom slots start flat and can be edited and saved.

## Screenshots

### Profiles

Choose a profile to apply it immediately. The active profile has a check mark. Adjust the frequency bars to apply and save changes; **Reset** restores the original profile. Three custom slots are available.

![Profiles screen showing the Rock profile and EQ bars](docs/screenshots/profiles.png)

### Scene

Adjust balance and fade while the dot shows the sound position in the cabin. Changes apply immediately; **Reset** returns the scene to the center.

![Scene screen with balance, fade, and a sound-position preview](docs/screenshots/scene.png)

### Surround

Turn surround sound on or off and adjust its level from −2 to +2.

![Surround screen](docs/screenshots/surround.png)

### Settings

Select **Stereo** or **Harman Kardon** as the audio type. Stereo shows Scene and Settings; Harman Kardon also shows Profiles and Surround.

![Settings screen showing audio type selection](docs/screenshots/settings.png)

The Scene screen in Stereo mode:

![Scene screen in Stereo mode](docs/screenshots/stereo-scene.png)

## Install with MGU Store

1. Install and open [MGU Store](https://github.com/robertnisipeanu/mgu-store) on the head unit.
2. In MGU Store, open **Settings** → **Add source**.
3. Enter `timokhin/id7-eq-config` and confirm.
4. Select the **Releases** channel when prompted.
5. Open **Store**, select **EQ Config**, and choose **Install**. If it is already installed, choose **Update**.

MGU Store requires a connection to fetch the GitHub release. For full-screen touch interaction, the head unit needs a compatible MGU renderer; controller input also requires a controller gate.

### Install from USB

With MGU Store already installed, connect a USB stick prepared as an MGU Store source, open **USB** in the Store, select **EQ Config**, and choose **Install** or **Update**. See the [MGU Store documentation](https://github.com/robertnisipeanu/mgu-store#offline-usb-stick) for preparing a USB source.

## Controls

On the iDrive controller, move focus to a slider and press the controller to enter edit mode. Turn it to change the value, then press again to finish. You can also adjust sliders using the touchscreen.

The app reads available audio properties and verifies written values. If a write fails, it attempts to restore the previous values. The currently used mappings were observed on one vehicle: `sink:1` Bass = 2, Treble = 3, Balance = 4, Fade = 5, EQ bands = 6–12, Surround = 14, and surround level = 15. Negative Balance moves the scene left. The Fade display is inverted relative to the raw vehicle value so that positive Fade moves the scene forward. Tone, EQ, balance, and fade use a −10 to +10 scale; surround level uses −2 to +2.

## Feedback

Found a problem or have an idea? Please [open an issue](https://github.com/timokhin/id7-eq-config/issues) in the repository. Include your vehicle, audio system, and iDrive version when relevant.

## Build

Run `python3 tools/build_release.py` to build an installable package in `dist/`. The package does not include BMW's proprietary SDK. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party license information.
