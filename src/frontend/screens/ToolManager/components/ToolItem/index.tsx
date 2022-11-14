import './index.css'

import React, { useContext, useEffect, useState } from 'react'

import { ToolVersionInfo, ProgressInfo, State } from 'common/types/toolmanager'
import { ReactComponent as DownIcon } from 'frontend/assets/down-icon.svg'
import { ReactComponent as StopIcon } from 'frontend/assets/stop-icon.svg'
import { SvgButton } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'

import { notify, size } from 'frontend/helpers'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'

const ToolItem = ({
  version,
  date,
  downsize,
  disksize,
  download,
  checksum,
  isInstalled,
  hasUpdate,
  installDir,
  type
}: ToolVersionInfo) => {
  const { t } = useTranslation()
  const { refreshToolVersionInfo: refreshToolVersionInfo } =
    useContext(ContextProvider)
  const [progress, setProgress] = useState<{
    state: State
    progress: ProgressInfo
  }>({ state: 'idle', progress: { percentage: 0, avgSpeed: 0, eta: Infinity } })

  useEffect(() => {
    if (version) {
      const removeToolManagerDownloadListener =
        window.api.handleProgressOfToolManager(
          version,
          (
            e: Electron.IpcRendererEvent,
            progress: {
              state: State
              progress: ProgressInfo
            }
          ) => {
            setProgress(progress)
          }
        )
      return removeToolManagerDownloadListener
    }
    /* eslint-disable @typescript-eslint/no-empty-function */
    return () => {}
  }, [])

  if (!version || !downsize) {
    return null
  }

  const isDownloading = progress.state === 'downloading'
  const unZipping = progress.state === 'unzipping'

  async function install() {
    notify({ title: `${version}`, body: t('notify.install.startInstall') })
    window.api
      .installToolVersion({
        version,
        date,
        downsize,
        disksize,
        download,
        checksum,
        isInstalled,
        hasUpdate,
        type,
        installDir
      })
      .then((response) => {
        switch (response) {
          case 'error':
            notify({ title: `${version}`, body: t('notify.install.error') })
            break
          case 'abort':
            notify({ title: `${version}`, body: t('notify.install.canceled') })
            break
          case 'success':
            refreshToolVersionInfo(false)
            notify([`${version}`, t('notify.install.finished')])
            break
          default:
            break
        }
      })
  }

  async function remove() {
    window.api
      .removeToolVersion({
        version,
        date,
        downsize,
        disksize,
        download,
        checksum,
        isInstalled,
        hasUpdate,
        installDir,
        type
      })
      .then((response) => {
        if (response) {
          refreshToolVersionInfo(false)
          notify([`${version}`, t('notify.uninstalled')])
        }
      })
  }

  function openInstallDir() {
    installDir !== undefined ? window.api.showItemInFolder(installDir) : {}
  }

  const renderStatus = () => {
    let status
    if (isInstalled) {
      status = size(disksize)
    } else {
      if (isDownloading) {
        status = getProgressElement(progress.progress, downsize)
      } else if (progress.state === 'unzipping') {
        status = t('tool.manager.unzipping', 'Unzipping')
      } else {
        status = size(downsize)
      }
    }
    return status
  }

  // using one element for the different states so it doesn't
  // lose focus from the button when using a game controller
  const handleMainActionClick = () => {
    if (isInstalled) {
      remove()
    } else if (isDownloading || unZipping) {
      window.api.abort(version)
    } else {
      install()
    }
  }

  const mainActionIcon = () => {
    if (isInstalled || isDownloading || unZipping) {
      return <StopIcon />
    } else {
      return <DownIcon className="downIcon" />
    }
  }

  const mainIconTitle = () => {
    if (isInstalled) {
      return `Uninstall ${version}`
    } else if (isDownloading || unZipping) {
      return `Cancel ${version} installation`
    } else {
      return `Install ${version}`
    }
  }

  return (
    <div className="toolManagerListItem">
      <span className="toolManagerTitleList">{version}</span>
      <div className="toolManagerListDate">{date}</div>
      <div className="toolManagerListSize">{renderStatus()}</div>
      <span className="icons">
        {isInstalled && (
          <SvgButton
            className="material-icons settings folder"
            onClick={() => openInstallDir()}
            title={`Open containing folder for ${version}`}
          >
            <FontAwesomeIcon
              icon={faFolderOpen}
              data-testid="setinstallpathbutton"
            />
          </SvgButton>
        )}

        <SvgButton onClick={handleMainActionClick} title={mainIconTitle()}>
          {mainActionIcon()}
        </SvgButton>
      </span>
    </div>
  )
}

function getProgressElement(progress: ProgressInfo, downsize: number) {
  const { percentage, eta, avgSpeed } = progress

  let totalSeconds = eta
  const hours = Math.floor(totalSeconds / 3600)
  totalSeconds %= 3600
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  // https://stackoverflow.com/a/40350003
  const formattedTime = [
    hours,
    minutes > 9 ? minutes : hours ? '0' + minutes : minutes || '0',
    seconds > 9 ? seconds : '0' + seconds
  ]
    .filter(Boolean)
    .join(':')

  const percentageAsString = `${percentage}%`
  const bytesAsString = `[${size((percentage / 100) * downsize)}]`
  const etaAsString = `| ETA: ${formattedTime}`
  const avgSpeedAsString = `(${size(avgSpeed)}ps)`

  return (
    <p
      style={{
        color: '#0BD58C',
        fontStyle: 'italic'
      }}
    >
      {[percentageAsString, bytesAsString, avgSpeedAsString, etaAsString].join(
        ' '
      )}
    </p>
  )
}

export default ToolItem