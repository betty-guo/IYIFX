import React, { Component } from 'react'
import { Search, Grid, Segment } from 'semantic-ui-react'
import axios from 'axios'
import Clarifai from 'clarifai'
import RadarChart from './RadarChart'

import './App.css'
import 'semantic-ui-css/semantic.min.css'

// LOL please don't steal our free API key lmao
const clarifaiApp = new Clarifai.App({
  apiKey: `6bcf849cc1b04b889d8ab09af9b516f5`
})

class InstagramSearch extends Component {
  state = {
    isLoading: false,
    results: [],
    value: '',
    timeout: null
  }

  handleResultSelect = async (e, { result }) => {
    this.setState({ value: result.title })

    // Goddamnit CORS on instagram
    this.props.setComputingText('Loading...')
    this.props.setIsComputing(true)
    const { data, followers } = await axios.post('https://us-central1-hack-the-north-2018-216509.cloudfunctions.net/getInstagramUserProfile', {username: result.title}).then(x => x.data)

    this.props.setComputingText('Obtained instagram data, getting color info')
    const comments = data.map(x => x.comments)
    const likes = data.map(x => x.likes)
    const pictures = data.map(x => x.picture)

    // Get data on Color
    const colorData = await clarifaiApp.models.predict('eeed0b6733a644cea07cf4c60f87ebb7', pictures)
                        .then(x => x.outputs)

    // Get data on moderation
    this.props.setComputingText('Getting moderation information')
    const moderationData = await clarifaiApp.models.predict('d16f390eb32cad478c7ae150069bd2c6', pictures)
                        .then(x => x.outputs)

    // General (can see person, but can't see faces)
    this.props.setComputingText('Getting general information')
    const generalData = await clarifaiApp.models.predict('aaa03c23b3724a16a56b629203edc62c', pictures)
                        .then(x => x.outputs)

    // Calculate depressiveness
    // Colors that indicate depression
    // If > 2 colors have > 25% then its likely
    // OR if 2 colors have > 40% then its likely
    // If > 75% of the colors are listed below then its likely

    // 1. Rosybrown + black
    // 2. Rosybrown + black + magenta (super strong)
    // 3. *Gray (weak)
    // 4. MediumPurple + black (strong)
    // 5. BlueViolet + black
    // 6. Indigo + black
    // 7. *Gray + Black
    // 8. *Gray + Black + PaleGoldenRod
    // 9. Thistle + Black
    // 10. Dark Orchid + Black
    // 11. Linen + Black
    // 12. Dark Salmon
    const depressingColorsDict = {
      rosybrown: true,
      black: true,
      magenta: true,
      mediumpurple: true,
      blueviolet: true,
      indigo: true,
      palegoldenrod: true,
      thistle: true,
      darkorchid: true,
      darksalmon: true,
    }

    const colorScores = colorData.map((c) => {
      const colors = c.data.colors.filter(x => x.value > 0.2)
      const depressingColors = colors.filter(x => {
        const xprime = x.w3c.name.toLowerCase()
        return depressingColorsDict[xprime] || false
      })

      if (depressingColors.length < 1) {
        return 0
      }

      return 1
    })

    // Moderation, check for drugs and gore
    // 1. drugs
    // 2. gore
    const moderationScores = moderationData.map(c => {
      const depressingConcepts = c.data.concepts
        .filter(x => x.value > 0.75)
        .filter(x => {
          return x.name === 'drug' || x.name === 'gore'
        })
      
      return (depressingConcepts.length > 0 ? 1 : 0)
    })

    // General data (filter out <0.75 confidence)
    // 1. one
    // 2. people
    // 3. smoke
    // 4. dark
    // 5. has one/people/girl/man in it, but lacks facial expression
    const generalScores = generalData.map((c) => {
      const generalConcepts = c.data.concepts
        .filter(x => x.value > 0.75)
        .map(x => x.name)
        .reduce((map, a) => {
          map[a] = true;
          return map
        }, {'facial expression': false, 'one': false, 'people': false, 'smoke': false, 'dark': false, 'girl': false, 'man': false})

      // If has people and no facial expression
      if ((generalConcepts['one'] || generalConcepts['people'] || generalConcepts['man'] || generalConcepts['girl'])){
        if (!generalConcepts['facial expression']) {
          return 1
        }
      }

      return 0
    })

    // IF user has < 1k followers,
    // then if User like is < 10% of following, then + 1
    // else if < 3% following, then + 1
    const likeEngagementScores = likes.map(x => {
      if (followers > 1000) {
        if (x < followers * 0.03) {
          return 1
        }
        return 0
      } else {
        return (x < followers * 0.1) ? 1 : 0
      }
    })

    // Has recurring < 3 comments
    const commentEngagementScores = comments.map(x => {
      return (x > 3) ? 0 : 1
    })

    const possiblyDepressedPictures = pictures.reduce((acc, x, i) => {
      // If score > 4 then its probably
      // bad score
      const totalScore = commentEngagementScores[i] +
                    likeEngagementScores[i] +
                    generalScores[i] + 
                    moderationScores[i] +
                    colorScores[i]
      
      if (totalScore >= 4) {
        acc.push({
          commentEngagement: commentEngagementScores[i],
          likeEngagement: likeEngagementScores[i],
          generalScore: generalScores[i],
          moderationScore: moderationScores[i],
          colorScore: colorScores[i],
        })
      }
      return acc
    }, [])

    this.props.setPossiblyDepressedPictures(possiblyDepressedPictures)
    this.props.setIsComputing(false)
  }

  handleSearchChange = (e, { value }) => {
    clearTimeout(this.state.timeout)

    const timeout = setTimeout(async () => {
      const queryURL = 'https://www.instagram.com/web/search/topsearch/?context=blended&query=' + value
      const results = await axios.get(queryURL)
      const userResults = results.data.users.slice(0, 24).map((x) => {
        return {
          title: x.user.username,
          description: x.user.full_name,
          image: x.user.profile_pic_url,
          isprivate: x.user.is_private
        }
      })

      this.setState({ isLoading: false, results: userResults })
    }, 500)

    this.setState({ isLoading: true, value, timeout })
  }

  render() {
    const { isLoading, results, value } = this.state

    return (
      <Search
        input={{ fluid: true }}
        loading={isLoading}
        onResultSelect={this.handleResultSelect}
        onSearchChange={this.handleSearchChange}
        placeholder="Target Instagram profile username"
        results={results}
        value={value}
      />
    )
  }
}

class App extends Component {
  state = {
    isComputing: false,
    computingText: 'Loading...',
    possiblyDepressedPictures: []
  }

  setComputingText = (t) => {
    this.setState({ computingText: t })
  }

  setIsComputing = (b) => {
    this.setState({ isComputing: b })
  }

  setPossiblyDepressedPictures = (p) => {
    this.setState({ possiblyDepressedPictures: p })
  }

  render() {
    const { isComputing, computingText } = this.state

    return (
      <Grid columns={3} stackable>
        <Grid.Row stretched>
          <Grid.Column />
          <Grid.Column verticalAlign='middle' textAlign='center'>
            <Segment vertical>
              <InstagramSearch
                setComputingText={this.setComputingText}
                setPossiblyDepressedPictures={this.setPossiblyDepressedPictures}
                setIsComputing={this.setIsComputing}
                />
              { isComputing ?
              <div>{computingText}</div>
              :
              <RadarChart />
              }
            </Segment>
          </Grid.Column>
          <Grid.Column />
        </Grid.Row>
      </Grid>
    )
  }
}

export default App
