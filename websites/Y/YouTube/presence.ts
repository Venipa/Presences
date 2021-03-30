const localizedStringKeys = {
    play: "general.playing",
    pause: "general.paused",
    live: "general.live",
    ad: "youtube.ad",
    search: "general.searchFor",
    browsingVid: "youtube.browsingVideos",
    browsingPlayl: "youtube.browsingPlaylists",
    viewCPost: "youtube.viewingCommunityPost",
    ofChannel: "youtube.ofChannel",
    readChannel: "youtube.readingChannel",
    searchChannel: "youtube.searchChannel",
    trending: "youtube.trending",
    browsingThrough: "youtube.browsingThrough",
    subscriptions: "youtube.subscriptions",
    library: "youtube.library",
    history: "youtube.history",
    purchases: "youtube.purchases",
    reports: "youtube.reportHistory",
    upload: "youtube.upload",
    viewChannel: "general.viewChannel",
    viewAllPlayL: "youtube.viewAllPlaylist",
    viewEvent: "youtube.viewLiveEvents",
    viewLiveDash: "youtube.viewLiveDashboard",
    viewAudio: "youtube.viewAudioLibrary",
    studioVid: "youtube.studio.viewVideos",
    studioEdit: "youtube.studio.editVideo",
    studioAnaly: "youtube.studio.videoAnalytics",
    studioComments: "youtube.studio.videoComments",
    studioTranslate: "youtube.studio.videoTranslations",
    studioTheir: "youtube.studio.viewTheir",
    studioCAnaly: "youtube.studio.channelAnalytics",
    studioCComments: "youtube.studio.channelComments",
    studioCTranslate: "youtube.studio.channelTranslations",
    studioArtist: "youtube.studio.artistPage",
    studioDash: "youtube.studio.dashboard",
    viewPlaylist: "general.viewPlaylist",
    readAbout: "general.readingAbout",
    viewAccount: "general.viewAccount",
    viewHome: "general.viewHome",
    watchVid: "general.watchingVid",
    watchLive: "general.watchingLive",
    browsing: "general.browsing",
    searchSomething: "general.searchSomething",
    watchStreamButton: "general.buttonWatchStream",
    watchVideoButton: "general.buttonWatchVideo",
    viewChannelButton: "general.buttonViewChannel"
  },
  IMAGES = {
    LOGO: "logoaltx1024",
    PLAY: "playx1024",
    PAUSE: "pausex1024",
    BROWSE: "browsex1024",
    SEARCH: "searchx1024",
    LIVE: "livex1024"
  };
interface PageContext {
  middleware: (ref: Window, ...args: unknown[]) => boolean;
  exec: (
    context: Presence,
    data: PresenceData,
    options?: ExecutionArguments
  ) => Promise<PresenceData> | PresenceData;
  destroy?: (data?: PresenceData) => void;
}
type LocalizedStrings = {
  [P in keyof typeof localizedStringKeys]: string;
};
type ImageStrings = {
  [P in keyof typeof IMAGES]: string;
};
interface VideoEntity {
  "@type": string;
  name: string;
  description: string;
  author: string;
  duration: string;
  publication: {
    endDate: string;
    isLiveBroadcast: boolean;
    startDate: string;
  }[];
}
interface ExecutionArguments {
  strings: LocalizedStrings;
  images: ImageStrings;
  settings: { [key: string]: string };
  [key: string]: unknown;
}
function getQuery() {
  const queryString = location.search.split("?", 2),
    query =
      queryString && queryString.length > 0 && queryString[1]
        ? queryString[1].split("&").reduce(function (l, r) {
            const entry = r ? r.split("=", 2) : null;
            if (entry == null) return l;
            return Object.assign(l, { [entry[0]]: entry[1] });
          }, {})
        : {};
  return query;
}
const helper = {
  getVideoPlayer(): HTMLVideoElement {
    return document.querySelector(`.ytd-player video`);
  },
  getVideoEntity(): VideoEntity {
    const object = Array.from(
      document.querySelectorAll(`script[type="application/ld+json"]`)
    ).find((x) => x.textContent.indexOf(`"@type":"VideoObject"`) !== -1)
      ?.textContent;
    if (!object) return null;
    return JSON.parse(object);
  },
  replaceVars(input: string, keyVal: { [key: string]: string }) {
    if (!input) return input;
    Object.entries(keyVal).forEach(
      ([k, v]) => (input = input.split(k).join(v))
    );
    return input;
  }
};
(function () {
  const pages: PageContext[] = [
      {
        middleware: (ref) => !!ref.document.querySelector(`.ytd-player video`),
        exec: (context, data, { strings, images, settings }) => {
          const videoEntity = helper.getVideoEntity(),
            videoPlayer = helper.getVideoPlayer();
          data.details = helper.replaceVars(settings.vidDetail, {
            "%title%": videoEntity.name,
            "%uploader%": videoEntity.author
          });
          data.state = helper.replaceVars(settings.vidState, {
            "%title%": videoEntity.name,
            "%uploader%": videoEntity.author
          });
          if (!videoPlayer.paused) {
            const [start, end] = context.getTimestamps(
              videoPlayer.currentTime,
              videoPlayer.duration
            );
            data.startTimestamp = start;
            data.endTimestamp = end;
            data.smallImageKey = videoEntity.publication?.find(x => x.isLiveBroadcast && !x.endDate) ? images.LIVE : images.PLAY;
            data.smallImageText = `${strings.play} ${data.details}`;
          } else {
            data.smallImageKey = images.PAUSE;
            delete data.startTimestamp;
            delete data.endTimestamp;
          }
          return data;
        },
        destroy: (data) => {
          if (data.smallImageText) delete data.smallImageText;
          if (data.startTimestamp) delete data.startTimestamp;
          if (data.endTimestamp) delete data.endTimestamp;
        }
      },
      {
        middleware: () => true,
        exec: (context, data, { strings, images }: ExecutionArguments) => {
          if (!context) return null;
          data.details = strings.browsing;
          if (data.state) delete data.state;
          if (data.smallImageKey) delete data.smallImageKey;
          return data;
        }
      }
    ],
    presence = new Presence({
      clientId: "826229153099022358"
    }),
    log = {
      error: (...args: any[]) => console.error(`PREMID:ERROR`, ...args),
      debug: (...args: any[]) => console.log(`PREMID:DEBUG`, ...args)
    };
  (function (app: Presence) {
    function getSettings<T extends string>(
      ...key: T[]
    ): Promise<{ [P in T]: string }> {
      return Promise.all(
        key.map((k) => app.getSetting(k).then((x) => ({ key: k, value: x })))
      ).then((settings) => {
        return settings.reduce(
          (l, r) => ({ ...l, [r.key]: r.value }),
          <{ [P in T]: string }>{}
        );
      });
    }
    let lastPageIndex: number,
      currentLang = "en",
      localizedStrings: LocalizedStrings;
    log.debug("premid:init", app.metadata.service);
    app.on("UpdateData", async () => {
      const newLang = await app.getSetting("lang").catch(() => null),
        settings = await getSettings(
          "privacy",
          "time",
          "vidDetail",
          "vidState",
          "buttons"
        ).catch((...args: any[]) => {
          log.error(...args);
          return {
            privacy: "true",
            time: null,
            vidDetail: `%title%`,
            vidState: `%uploader%`,
            buttons: null
          };
        });
      if (newLang !== currentLang) {
        currentLang = newLang;
        localizedStrings = await app
          .getStrings(localizedStringKeys, newLang || "en")
          .catch(() =>
            Object.keys(localizedStringKeys).reduce(
              (l, r) => ({ ...l, [r]: r }),
              <LocalizedStrings>{}
            )
          );
      }
      const presenceData: PresenceData = {
          largeImageKey: IMAGES.LOGO
        },
        query: { [key: string]: unknown } = getQuery();

      if (!localizedStrings) {
        presence.clearActivity();
        return presenceData;
      }
      const pageIndex = pages.findIndex((x) => x.middleware(window, [query])),
        context = pages[pageIndex];
      if (!context) return false;
      const result = Promise.resolve(
        context.exec(app, presenceData, {
          strings: localizedStrings,
          query,
          images: IMAGES,
          settings
        })
      );
      return await result
        .then((data) => {
          log.debug("premid", data);
          if (
            lastPageIndex !== undefined &&
            lastPageIndex !== pageIndex &&
            pages[lastPageIndex] &&
            typeof pages[lastPageIndex].destroy === "function"
          ) {
            pages[lastPageIndex].destroy(data);
            lastPageIndex = pageIndex;
          }
          if (!data) {
            presence.setTrayTitle();
            presence.setActivity({
              largeImageKey: IMAGES.LOGO,
              state: localizedStrings.browsing
            });
          } else {
            if (data.details) presence.setActivity(data);
            if (data.buttons && data.buttons.length === 0) delete data.buttons;
            else data.buttons = data.buttons?.slice(0, 2);
          }
          return data;
        })
        .catch(log.error);
    });
  })(presence);
})();
