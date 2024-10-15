# face-services

> [!IMPORTANT]
> Recently, I started working on the **fourth generation** of [**Jenny**][BOT], a Telegram bot with a quirky personality. Jenny can see the environment around her through the lens of an ESP32 Cam Module. It has always been my dream to build a robot that can recognize me and interact with me. That's why I have been exploring ways to use facial recognition in Nodejs. This is a basic demonstration of how I intend to integrate it into my robot.

Luckily, I found [**this YouTube video**][YT_VID] by [**Robert Bunch (@robertbunch)**][GH_ACC_01], in which he briefly introduced me to [**face-api.js**][FACE_API_JS] and [**Tensorflow.js**][TF_JS].

Later, I found that [**face-api.js**][FACE_API_JS] is no longer maintained, and the last update was like... **four years ago**. So, I switched to [**one of its forks**][FACE_API_JS_FORK] by [**Vladimir Mandic (@vladmandic)**][GH_ACC_02]. However, that repository also seems to be archived at the time of writing this.

# Getting Started

## Installing the dependencies

Run the following command in the terminal:

```bash
npm install
```

This will install the following NPM dependencies:

-   [**@vladmandic/face-api**][NPM_04]: One of the forks of [**face-api.js**][FACE_API_JS]
-   [**canvas**][NPM_01]: Required for polyfilling `Canvas` in Nodejs
-   [**@tensorflow/tfjs**][NPM_02] and [**@tensorflow/tfjs-node**][NPM_03]: Required for this fork of **face-api.js**
-   [**node-screenshots**][NPM_05]: Required for taking screenshots using Nodejs (used for testing)
-   [**node-webcam**][NPM_06]: Required for capturing webcam feed using Nodejs (used for testing)

## Training

Before testing the demo, we need to train the model using our own images. To do this, we can create one or more subfolders in the data directory, each containing images of a specific person's face. For instance, if we want to train the model for two people named **Kaniz** and **Shahriar**, the directory structure would be as follows:

```
/
└── 📁 data
    ├── 📁 kaniz
    └── 📁 shahriar

```

These subfolders can contain one or more supported images (`jpg/jpeg` or `png`) with the person's face visible:

```
/
└── 📁 data
    ├── 📁 kaniz
    │   ├── 📄 DSC_0233.jpg
    │   ├── 📄 FB_IMG_1715114037413.jpg
    │   ├── 📄 IMG_20240711_224231_495.jpg
    │   ├── 📄 basis_club_pfp.png
    │   └── ...
    └── 📁 shahriar
        ├── 📄 IMG_20240715_214759_834.jpg
        ├── 📄 IMG_20240718_111745_269.jpg
        ├── 📄 IMG_20240715_001924_628.jpg
        ├── 📄 IMG_20240715_062111_313.jpg
        ├── 📄 IMG_20240507_014108_611.jpg
        └── ...
```

> [!NOTE]
> The images can named any way; it is **NOT** necessary to rename them as `img_01.jpg`, `img_02.jpg`, and so on.

When the files are in place, we can run:

```bash
node train.js
```

It may take some time to train the model, depending on the number of images it has been trained on. But once the model is trained, it will create a JSON file `trained.json` containing the descriptors:

```JSON
[
	{
		"label": "kaniz",
		"descriptors": [[...], [...], ...]
	},
	{
		"label": "shahriar",
		"descriptors": [[...], [...], ...]
	}
]
```

> [!NOTE]
> It is possible to train the model with **only 1 image** per person but to improve accuracy, it is recommended to use **20-30 images**.

## Testing

Once the model is successfully trained, we can test the demonstration.

### From local file

Create an image named `test.jpg` in the current folder to detect faces from the image. Then run:

```bash
node .
```

### From screen

It is possible to detect faces from whatever is currently visible on the screen. To do this, change the `source` variable to `"screenshot"` in the `index.js` file. Then run `node .`

If you want to detect faces within a specific window, you need to provide a `sourceID`. We can obtain a list of available windows by running:

```bash
node metadata.js
```

Copy the ID of your desired window and paste it to the `sourceID` variable. If the `sourceID` is **null**, the entire monitor would be used to detect faces.

### From webcam feed

It is also possible to detect faces from the webcam feed. To do this, change the `source` variable to `"webcam"` in the `index.js` file. Get an available list of webcams by running `node metadata.js` and then update the `webcamDeviceID` variable.

In any case, it will generate a `result.jpg` file and draw boxes around the recognized faces.

## Available Devices

We can obtain a list of available devices by running:

```bash
node metadata.js
```

It should yield something similar to the following:

```bash
✅ 1 monitor found
   🔷 ID: 65537 \\.\DISPLAY1 (Primary)

✅ 4 windows found
   🔷 ID: 65742 (Windows Explorer)
   🔷 ID: 853460 (MPC-HC x64)
   🔷 ID: 460142 (Visual Studio Code)
   🔷 ID: 1246018 (Firefox)

✅ Available cameras:
   🔷 ID: "1"
   🔷 ID: "2"
   🔷 ID: "3"
```

## Troubleshooting

Here are a few key points I would like to address:

-   **face-api.js** (and its forks) depend on [**node-canvas**][NPM_01] for polyfilling `Canvas` in Nodejs. I did not need to build from source because it was on a Windows machine. However, if you plan to use it in an unsupported machine (e.g., [**Raspberry Pi**][WIKI_RPI]), you _might_ need to build from source. [**Click here**][NPM_01_BUILD] for instructions.

-   [**@vladmandic/face-api**][FACE_API_JS_FORK] requires both [**@tensorflow/tfjs**][NPM_02] and [**@tensorflow/tfjs-node**][NPM_03] to work correctly. We must install the same version of both packages.

-   If you encounter any errors while importing `@tensorflow/tfjs`, you might need to copy these two files:

    ```
    node_modules/@tensorflow/tfjs-node/deps/lib/tensorflow.dll
    node_modules/@tensorflow/tfjs-node/deps/lib/tensorflow.lib
    ```

    and paste them into:

    ```
    node_modules/@tensorflow/tfjs-node/lib/napi-v8
    ```

# License

The source code is licensed under the [**MIT License**][LICENSE].

<!-- === links === -->

[NPM_01]: https://www.npmjs.com/package/canvas
[NPM_01_BUILD]: https://www.npmjs.com/package/canvas#compiling
[NPM_02]: https://www.npmjs.com/package/@tensorflow/tfjs
[NPM_03]: https://www.npmjs.com/package/@tensorflow/tfjs-node
[NPM_04]: https://www.npmjs.com/package/@vladmandic/face-api
[NPM_05]: https://www.npmjs.com/package/node-screenshots
[NPM_06]: https://www.npmjs.com/package/node-webcam
[WIKI_RPI]: https://en.wikipedia.org/wiki/Raspberry_Pi
[FACE_API_JS_FORK]: https://github.com/vladmandic/face-api
[FACE_API_JS]: https://github.com/justadudewhohacks/face-api.js
[TF_JS]: https://github.com/tensorflow/tfjs
[YT_VID]: https://www.youtube.com/watch?v=cGFKc-XRYKQ
[GH_ACC_01]: https://github.com/robertbunch
[GH_ACC_02]: https://github.com/vladmandic
[BOT]: https://t.me/jenny_the_robot
[LICENSE]: ./LICENSE
